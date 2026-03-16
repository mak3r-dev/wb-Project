# Modules
from imports.glo import *

# Specific imports
from .users import UsersManager,Users

Events: type[Base] = getTable('Events')
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
    bookingID = Column(UUID(), unique=True, default=uuid6.uuid7)
    userID = Column(Int,ForeignKey('Users.userID','CASCADE','CASCADE'))
    eventID = Column(UUID(),ForeignKey('events.eventID','CASCADE','CASCADE'))  
    bookingStatus = Column(string(45), nullable=False, default='active')
    dateTimeBooked = Column(DateTime, nullable=False)
    totalPrice = Column(Float, nullable=False)
    paymentStatus = Column(string(45), nullable=False, default='unpaid')

    @property
    def bID(self): return str(uuid.UUID(bytes=self.bookingID))

    def convert_all(result: list[dict]):
        for res in result:
            res['bookingID'] = str(uuid.UUID(bytes=res['bookingID']))

        return result
    
    def insert_all_static():
        [db.add(BookingDiscount(e)).on_duplicate() for e in config.discounts_db.values()]
        db.commit()

    def update_booking_cache():
        discounts = db.query(BookingDiscount).all(as_dict=True)

        for dis in discounts:
            config.discounts_db[dis['discountID']] = dis

    def update_payment_status(bookingID: str = None) -> None:
        (db.update(BookedEvents.paymentStatus == 'paid')
            .where(BookedEvents.bookingID == bookingID).all()) 

        db.commit()
        return Action()._replace(message='Updated Status Successfully', OP='UPDATE_PAYMENT_STATUS')
       
    def cancel_booking(booking_ref: str, eventID: int) -> None:
        # 1. Update event & booking status
        (db.update(BookedEvents.bookingStatus == 'cancelled')
            .where(BookedEvents.bookingID == booking_ref).all()) 
        
        prev_av = config.events_db[eventID]['eventAvailability']
        config.events_db[eventID]['eventAvailability'] = prev_av + 1 
        db.update(Events.eventAvailability == (prev_av + 1)).where(Events.eventID == eventID).all()

        # 2. Update Waiting Status
        early_booking = (db.query(BookedEvents)
         .where(BookedEvents.bookingStatus == 'waiting')
         .order_by(BookedEvents.dateTimeBooked.asc())
         .limit(1).all(as_dict=True)
        )

        if (early_booking):
            (db.update(BookedEvents.bookingStatus == 'active')
            .where(BookedEvents.bookingID == booking_ref).all()) 

            BookedEvents.update_payment_status(early_booking[0]['bookingID'])

        db.commit()  
        return Action()._replace(message='Cancelled Event Successfully', OP='CANCEL_BOOKING')     

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

class BookingManager:

    def __init__(self):
        pass
      
    def check_user_status(self, request, eventName: dict):
        response = {'available' : True, 'booked' :False}

        # 1. Get event ID and UserID
        eventID = config.EVENT_NAME_INDEX.get(eventName)
        userID = Auth.validate_token(req=request).payload['id']
        
        # 2. Verify existence
        booked_event = (db.query(BookedEvents)
         .where(BookedEvents.userID == userID, BookedEvents.eventID == eventID).all(as_dict=True)
        )

        for bk in booked_event:
            # If event is already booking by user
            if bk['bookingStatus'] == 'active' and bk['paymentStatus'] == 'paid':
               response['booked'] = True
            
        # If event availability is full
        if config.events_db.get(eventID)['eventAvailability'] == 0:
            response['available'] = False
            
        return response
           
    def get_discounts(self): return db.query(BookingDiscount).all(as_dict=True)

    def final_booking_sequence(self,type: str, bookingInfo: dict[str,str | dict], B_REF: str = None) -> None:
        if not bookingInfo: return
        
        # 1. Calculate Price and important info
        recieved_tickets = bookingInfo.get('tickets')
        tickets = {i : recieved_tickets[i] for i in range(len(recieved_tickets))}
        eventID = bookingInfo.get('eventID')

        eInfo =  config.events_db[eventID]
        discount = config.discounts_db[bookingInfo['discountID']]['discountPercentage'] if bookingInfo['discountID'] else None

        DAY_RANGE = (eInfo['eventEnd'] - eInfo['eventStart']).days
        day_cost = eInfo['eventPrice'] / (DAY_RANGE + 1)

        addOns = bookingInfo.get('AddOns')
        total_price = sum([day_cost * ticket['attendees'] for ticket in tickets.values()] + [config.add_ons_db[aid]['Price'] for aid in addOns])
        total_price = total_price - (total_price * discount/ 100) if discount else total_price    

        # 2. CALCULATE_TOTAL -> ACTION_TYPE
        if type == 'CALCULATE_TOTAL':

            # A. Get booing ref
            new_ref = uuid6.uuid7()     
            return bookingResponse()._replace(Message='Successfully Calculated total!',booking_ref=new_ref,totalPrice=total_price)    

        # 3. INSERT_INFO -> ACTION_TYPE
        userID = Auth.validate_token(req=request).payload['id']
        new_booking = BookedEvents(bookingID=B_REF, userID=userID,eventID=eventID,
            dateTimeBooked=datetime.datetime.now(datetime.timezone.utc), totalPrice = total_price
        )   
     
        db.add(new_booking).on_duplicate()
        # 2. Calucate and add individual ticket info
        for ticket in tickets.values():
            entry = BookingEntries({
                'bookingID' : new_booking.bID,
                'entries' : datetime.datetime.now(datetime.timezone.utc),
                'attendees' : ticket['attendees'],
                'dayCost' : day_cost - (day_cost * (discount/ 100)) if discount else day_cost
            })        

            db.add(entry).on_duplicate()
        
        # 3. Insert Add-Ons Chosen
        [db.add(BookingAddOns(bookingID=new_booking.bID,addID=aid)).on_duplicate() for aid in bookingInfo.get('AddOns')]

        # 4. Insert user Info
        userInfo = UsersManager.validate_booking_info(bookingInfo.get('userInfo'))
      
        (db.update(Users.Phone == userInfo['Phone'])
         .where(Users.Email == userInfo['Email'], Users.FirstName == userInfo['FirstName'], Users.LastName == userInfo['LastName'])
         .all()
        )
        config.users_db[userID]['Phone'] = userInfo['Phone']

        # 5. Update Booking status
        if eInfo['eventAvailability'] == 0:
            (db.update(BookedEvents.bookingStatus == 'waiting')
             .where(BookedEvents.bookingID == new_booking.bID).all()  
            )  

        # 6. Update event availability 
        else:
            prev_av = eInfo['eventAvailability']
            config.events_db[eventID]['eventAvailability'] = prev_av - 1 
            db.update(Events.eventAvailability == (prev_av - 1)).where(Events.eventID == eventID).all()

        db.commit()
        return bookingResponse()._replace(Message='Successfully Booked Event!',booking_ref=B_REF,totalPrice=total_price)    
    
    def action(self, OP: str, ID: int | str, DATA: dict | str):        
        match OP:
            case 'CANCEL_BOOKING':
                if not isinstance(ID, str): return
                return BookedEvents.cancel_booking(ID,DATA)
            
            case 'UPDATE_PAYMENT_STATUS': 
                if not isinstance(ID, str): return
                return BookedEvents.update_payment_status(ID)

    def internal_actions(self, OP: str):
        match OP:
            case 'INSERT_DEFAULTS': BookedEvents.insert_all_static()
            case 'CACHE_DISCOUNTS': BookedEvents.update_booking_cache()

            
#Init
booking_manager = BookingManager()
bookings = BookedEvents
entries = BookingEntries