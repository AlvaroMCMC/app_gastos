from email_worker import process_message
from models import Expense, Item, ProcessedEmail, User
from tests.test_uber_email import build_email


def make_user_with_item(db, archived=False):
    user = User(email="a@test.com", hashed_password="x")
    db.add(user)
    db.flush()
    item = Item(name="Noviembre", item_type="personal", owner_id=user.id, is_archived=archived)
    db.add(item)
    db.commit()
    return user, item


def test_creates_uber_expense_in_latest_active_item(db):
    user, item = make_user_with_item(db)
    process_message(db, user, "<id-1@uber>", build_email())

    expense = db.query(Expense).one()
    assert (expense.description, expense.amount, expense.currency) == ("Uber", 11.60, "soles")
    assert expense.item_id == item.id and expense.paid_by == user.id
    assert db.get(ProcessedEmail, "<id-1@uber>").status == "created"


def test_non_receipt_is_marked_ignored_without_expense(db):
    user, _ = make_user_with_item(db)
    process_message(db, user, "<id-2@uber>", build_email(html="<p>Promo</p>"))

    assert db.query(Expense).count() == 0
    assert db.get(ProcessedEmail, "<id-2@uber>").status == "ignored"


def test_no_active_item_leaves_email_pending(db):
    user, _ = make_user_with_item(db, archived=True)
    process_message(db, user, "<id-3@uber>", build_email())

    assert db.query(Expense).count() == 0
    assert db.get(ProcessedEmail, "<id-3@uber>") is None


def test_baseline_is_created_once_and_stays_fixed(db):
    from email_worker import get_baseline

    first = get_baseline(db)
    assert get_baseline(db) == first
    assert db.get(ProcessedEmail, "__baseline__").status == "baseline"
