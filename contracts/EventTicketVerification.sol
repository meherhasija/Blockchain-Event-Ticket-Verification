// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EventTicketVerification {
    address public immutable organizer;
    uint256 public nextEventId = 1;
    uint256 public nextTicketId = 1;

    enum TicketStatus { Valid, Used, Cancelled }

    struct EventInfo {
        uint256 id;
        string name;
        string description;
        string venue;
        uint256 date;
        uint256 price;
        uint256 quantity;
        uint256 sold;
        bool active;
    }

    struct Ticket {
        uint256 id;
        uint256 eventId;
        address owner;
        TicketStatus status;
        uint256 originalPrice;
    }

    struct Listing { uint256 price; bool active; }

    mapping(uint256 => EventInfo) public events;
    mapping(uint256 => Ticket) public tickets;
    mapping(uint256 => Listing) public resaleListings;
    mapping(uint256 => uint256[]) private eventTicketIds;
    mapping(address => uint256[]) private ownerTicketIds;

    event EventCreated(uint256 indexed eventId, string name, uint256 price, uint256 quantity);
    event TicketPurchased(uint256 indexed ticketId, uint256 indexed eventId, address indexed buyer, uint256 price);
    event TicketUsed(uint256 indexed ticketId, address indexed verifier);
    event TicketCancelled(uint256 indexed ticketId, address indexed by);
    event TicketListed(uint256 indexed ticketId, uint256 price);
    event TicketResold(uint256 indexed ticketId, address indexed seller, address indexed buyer, uint256 price);

    modifier onlyOrganizer() { require(msg.sender == organizer, "Organizer only"); _; }

    constructor() { organizer = msg.sender; }

    function createEvent(string calldata name, string calldata description, string calldata venue,
        uint256 date, uint256 price, uint256 quantity) external onlyOrganizer returns (uint256) {
        require(bytes(name).length > 0 && bytes(venue).length > 0, "Missing event details");
        require(date > block.timestamp && price > 0 && quantity > 0, "Invalid event values");
        uint256 id = nextEventId++;
        events[id] = EventInfo(id, name, description, venue, date, price, quantity, 0, true);
        emit EventCreated(id, name, price, quantity);
        return id;
    }

    function getEvent(uint256 id) external view returns (EventInfo memory) { require(events[id].id != 0, "Event not found"); return events[id]; }
    function getEvents() external view returns (EventInfo[] memory result) {
        result = new EventInfo[](nextEventId - 1);
        for (uint256 i=1; i<nextEventId; i++) result[i-1] = events[i];
    }

    function buyTicket(uint256 eventId) external payable returns (uint256) {
        EventInfo storage e = events[eventId];
        require(e.id != 0 && e.active, "Event unavailable");
        require(e.sold < e.quantity && block.timestamp < e.date, "Sold out or event started");
        require(msg.value == e.price, "Incorrect ETH amount");
        e.sold++;
        uint256 id = nextTicketId++;
        tickets[id] = Ticket(id, eventId, msg.sender, TicketStatus.Valid, e.price);
        eventTicketIds[eventId].push(id);
        ownerTicketIds[msg.sender].push(id);
        emit TicketPurchased(id, eventId, msg.sender, msg.value);
        return id;
    }

    function getTicket(uint256 id) external view returns (Ticket memory) { require(tickets[id].id != 0, "Ticket not found"); return tickets[id]; }
    function getMyTickets(address owner) external view returns (Ticket[] memory result) {
        uint256[] storage ids = ownerTicketIds[owner];
        uint256 count;
        for (uint256 i=0; i<ids.length; i++) if (tickets[ids[i]].owner == owner) count++;
        result = new Ticket[](count);
        uint256 cursor;
        for (uint256 i=0; i<ids.length; i++) {
            if (tickets[ids[i]].owner == owner) result[cursor++] = tickets[ids[i]];
        }
    }
    function verifyTicket(uint256 id) external view returns (bool valid, Ticket memory ticket) {
        ticket = tickets[id];
        valid = ticket.id != 0 && ticket.status == TicketStatus.Valid;
    }
    function useTicket(uint256 id) external onlyOrganizer {
        Ticket storage t = tickets[id];
        require(t.id != 0 && t.status == TicketStatus.Valid, "Ticket not valid");
        t.status = TicketStatus.Used;
        emit TicketUsed(id, msg.sender);
    }
    function cancelTicket(uint256 id) external onlyOrganizer {
        Ticket storage t = tickets[id];
        require(t.id != 0 && t.status == TicketStatus.Valid, "Ticket cannot be cancelled");
        t.status = TicketStatus.Cancelled;
        resaleListings[id].active = false;
        emit TicketCancelled(id, msg.sender);
    }
    function listForResale(uint256 id, uint256 price) external {
        Ticket storage t = tickets[id];
        require(t.owner == msg.sender && t.status == TicketStatus.Valid, "Not eligible");
        require(price > 0 && price <= (t.originalPrice * 110) / 100, "Price exceeds 10% limit");
        resaleListings[id] = Listing(price, true);
        emit TicketListed(id, price);
    }
    function buyResale(uint256 id) external payable {
        Ticket storage t = tickets[id];
        Listing storage l = resaleListings[id];
        require(l.active && t.status == TicketStatus.Valid, "Listing unavailable");
        require(msg.sender != t.owner && msg.value == l.price, "Invalid buyer or payment");
        address seller = t.owner;
        l.active = false;
        t.owner = msg.sender;
        ownerTicketIds[msg.sender].push(id);
        (bool paid,) = payable(seller).call{value: msg.value}("");
        require(paid, "Seller payment failed");
        emit TicketResold(id, seller, msg.sender, msg.value);
    }
    function getResaleListing(uint256 id) external view returns (uint256 price, bool active) {
        Listing memory l = resaleListings[id]; return (l.price, l.active);
    }
    function getEventTicketIds(uint256 id) external view returns (uint256[] memory) { return eventTicketIds[id]; }
}
