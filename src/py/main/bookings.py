# Modules
from ..imports.glo import *

# Specific imports
from .users import UsersManager,Users,user_input_eval,phone_eval
from .events import Events

class bookingResponse(NamedTuple):
    Message: str = None
    booking_ref: UUID | str = None
    totalPrice: int | None = None

# Booking Discount Table -> Dynamic
class BookingDiscount(Base):

    __table__ = 'BookingDiscount'
    discountID =  Column(Int, primary_key=True, auto_increment=True)
    advance1 = Column(Int, nullable=False)
    advance2 = Column(Int, nullable=False)
    discountPercentage = Column(Int, nullable=False)

    const = Constraint(unique('discountPair','advance1','advance2'))

# Bookings Table -> Dynamic
class BookedEvents(Base):
    
    __table__ = 'BookedEvents'
    bookingID = Column(UUID(), unique=True, default=uuid.uuid4)
    userID = Column(Int,ForeignKey('Users.userID','CASCADE','CASCADE'))
    eventID = Column(Int,ForeignKey('events.eventID','CASCADE','CASCADE'))  
    bookingStatus = Column(string(45), nullable=False, default='Active')
    dateTimeBooked = Column(DateTime, nullable=False)
    totalPrice = Column(Float, nullable=False)
    paymentStatus = Column(string(45), nullable=False, default='expired')

    const = Constraint(unique('bookingusereventPair','userID','eventID'))

    @property
    def get_id(self): return str(uuid.UUID(bytes=self.bookingID))

    def convert_all(result: list[dict]):
        for res in result:
            res['bookingID'] = str(uuid.UUID(bytes=res['bookingID']))

        return result
    
# Bookings Add-Ons -> Dynamic
class BookingAddOns(Base):

    __table__ = 'BookingAddOns'
    bookingID = Column(UUID(),ForeignKey('BookedEvents.bookingID','NO ACTION','CASCADE'))
    addID = Column(Int,ForeignKey('AddOns.addID','CASCADE','CASCADE'))

    const = Constraint(unique('bookingAddPair','bookingID','addID'))

# Bookings Entries -> Dynamic
class BookingEntries(Base):

    __table__ = 'BookingEntries'
    entryID = Column(Int, auto_increment=True, primary_key=True)
    bookingID = Column(UUID(),ForeignKey('BookedEvents.bookingID','NO ACTION','CASCADE'))
    entries = Column(DateTime, nullable=False)
    attendees = Column(Int, nullable=False)
    dayCost = Column(Float, nullable=False)
    
    const = Constraint(unique('bookingentryattcostPair','entries','attendees','dayCost'))

class BookingManager:

    def __init__(self):
        pass
    
    def get_booking_ticket(self):
        # 1. Setup the buffer and canvas
        buffer = BytesIO()
        # We define a custom size (Width: 6 inches, Height: 3 inches)
        ticket_size = (6 * inch, 3 * inch)
        ticket = canvas.Canvas(buffer, pagesize=ticket_size)

        # 2. Draw a Border
        ticket.setLineWidth(1)
        ticket.rect(0.1*inch, 0.1*inch, 5.8*inch, 2.8*inch)      

        # 3. Add Branding / Header
        ticket.setFont("Helvetica-Bold", 18)
        ticket.drawString(0.3*inch, 2.4*inch, 'TEST EVENT')

        ticket.setFont("Helvetica", 10)
        ticket.setFillGray(0.3) # Subtle grey for secondary info
        ticket.drawString(0.3*inch, 2.2*inch, f"Date: 2026-10-10 | Time: 12:00")
        ticket.drawString(0.3*inch, 2.0*inch, f"Venue: Aston Gate, Bristol")

        # 4. Seat / Tier Info (The "High Visibility" area)
        ticket.setFillGray(0) # Reset to black
        ticket.setFont("Helvetica-Bold", 14)
        ticket.drawString(0.3*inch, 1.4*inch, f"SECTION: A4")
        ticket.drawString(0.3*inch, 1.1*inch, f"ROW: A  |  SEAT: 9")

        # 5. Generate and Draw the QR Code
        # We use 'segno' to create the QR, then convert it to an image ReportLab understands
        qr = segno.make(str(uuid.uuid4()), error='h') # 'h' is high error correction (best for printing)
        qr_buffer = BytesIO()
        qr.save(qr_buffer, kind='png', border=0, scale=10)
        qr_buffer.seek(0)

        qr_img = ImageReader(qr_buffer)
        # Positioning the QR code on the right side
        ticket.drawImage(qr_img, 4.3 * inch, 0.5 * inch, width=1.3 * inch, height=1.3 * inch)

        ticket.setFont("Helvetica", 7)
        ticket.drawCentredString(4.95 * inch, 0.4 * inch, 'TKT-99887766')     

        # 6. Finalize
        ticket.showPage()
        ticket.save()           
        buffer.seek(0)

        return buffer

    def update_payment_status(self, bookingID: str = None) -> None:
        # 1. Update status in db
        sql = (
            db.update(BookedEvents.paymentStatus == 'paid')
            .where(BookedEvents.bookingID == bookingID).all()
        )
        
        # 2. commit the db
        db.commit()

    def update_booking_status(self, bookingID: str = None, status: str = 'Active') -> None:
        # 1. Update status in db
        sql = (
            db.update(BookedEvents.bookingStatus == status)
            .where(BookedEvents.bookingID == bookingID).all()
        )
        
        # 2. commit the db
        db.commit()

    def insert_booking_info(self, bookingInfo: dict[str,str | dict]) -> None:
        if not bookingInfo: return
        
        recieved_tickets = bookingInfo.get('tickets')
        tickets = {i : recieved_tickets[i] for i in range(len(recieved_tickets))}
            
        # 1. Get statics
        eInfo =  config.events_db[bookingInfo.get('eventID')]
        discount = config.discounts_db[bookingInfo['discountID']]['discountPercentage'] if bookingInfo['discountID'] else None
        
        DAY_RANGE = (date.fromisoformat(eInfo['eventEnd']) - date.fromisoformat(eInfo['eventStart'])).days
        day_cost = eInfo['eventPrice'] / (DAY_RANGE + 1)
        
        # 2. Add a new booking entry
        addOns = bookingInfo.get('AddOns')
        total_price = sum([day_cost * ticket['attendees'] for ticket in tickets.values()] + [config.add_ons_db[aid]['Price'] for aid in addOns])
        total_price = total_price - (total_price * discount/ 100) if discount else total_price
        new_booking = BookedEvents(userID=UsersManager().get_id(),eventID=bookingInfo.get('eventID'),
            dateTimeBooked=datetime.datetime.now(datetime.timezone.utc), totalPrice = total_price
        )   
     
        db.add(new_booking).on_duplicate()
        # 2. Calucate and add individual ticket info
        for ticket in tickets.values():
            entry = BookingEntries({
                'bookingID' : new_booking.get_id,
                'entries' : datetime.datetime.fromisoformat(ticket['date']),
                'attendees' : ticket['attendees'],
                'dayCost' : day_cost - (day_cost * (discount/ 100)) if discount else day_cost
            })        

            db.add(entry).on_duplicate()
        
        # 3. Insert Add-Ons Chosen
        [db.add(BookingAddOns(bookingID=new_booking.get_id,addID=aid)).on_duplicate() for aid in bookingInfo.get('AddOns')]

        # 4. Insert user Info
        userInfo = UsersManager.validate_booking_info(bookingInfo.get('userInfo'))
      
        (db.update(Users.Phone == userInfo['Phone'])
         .where(Users.Email == userInfo['Email'], Users.FirstName == userInfo['FirstName'], Users.LastName == userInfo['LastName'])
         .all()
        )

        db.flush()

        # 5. Update Booking status
        if eInfo['eventAvailability'] == 0:
            (db.update(BookedEvents.bookingStatus == 'waiting')
             .where(BookedEvents.bookingID == new_booking.get_id).all()  
            )   

        # 6. Update event availability
        (db.update(Events.eventAvailability == eInfo['eventAvailability'] - 1)
         .where(Events.eventID == bookingInfo.get('eventID')).all()
        )
        eInfo['eventAvailability'] -= 1

        db.commit()
        return bookingResponse()._replace(Message='Successfully Booked Event!',booking_ref=new_booking.get_id,totalPrice=total_price)

    def check_user_status(self, request, eventName: dict):
        response = {'available' : True, 'booked' :False}

        # 1. Get event ID and UserID
        eventID = config.EVENT_NAME_INDEX.get(eventName)
        userID = Auth.validate_token(req=request).payload['id']
        
        # 2. Verify existence
        booked_event = (db.query(BookedEvents)
         .where(BookedEvents.userID == userID, BookedEvents.eventID == eventID).all()
        )
        
        # If event is already booking by user
        if booked_event and booked_event[0].paymentStatus == 'paid':
            response['booked'] = True
        
        # If event availability is full
        if config.events_db.get(eventID)['eventAvailability'] == 0:
            response['available'] = False
            
        return response
           
    def get_discounts(self): return db.query(BookingDiscount).all(as_dict=True)

    def insert_all_static(self):
        [db.add(BookingDiscount(e)).on_duplicate() for e in config.discounts_db.values()]
        db.commit()

#Init
booking_manager = BookingManager()
bookings = BookedEvents
entries = BookingEntries