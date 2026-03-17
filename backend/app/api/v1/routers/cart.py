from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from backend.app.core.database import get_db
from backend.app.models.cart import CartItem
from backend.app.models.unit import Unit
from backend.app.schemas.cart import CartItemCreate, CartItemResponse, CartResponse
from backend.app.api.v1.routers.auth import get_current_customer
from backend.app.models.customer import Customer

router = APIRouter(prefix="/cart", tags=["cart"])

@router.get("", response_model=CartResponse)
async def get_cart(
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(CartItem).where(CartItem.customer_id == customer.id))
    items = result.scalars().all()
    return CartResponse(items=items, total_items=len(items))

@router.post("", response_model=CartItemResponse, status_code=201)
async def add_to_cart(
    data: CartItemCreate,
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    # Check not already in cart
    existing = await db.execute(
        select(CartItem).where(CartItem.customer_id == customer.id, CartItem.unit_id == data.unit_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Unit already in cart")
    item = CartItem(customer_id=customer.id, unit_id=data.unit_id)
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item

@router.delete("/{item_id}")
async def remove_from_cart(
    item_id: UUID,
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id, CartItem.customer_id == customer.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Item not found")
    await db.delete(item)
    return {"deleted": True}

@router.get("/units")
async def get_cart_units(
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Get full unit details for all cart items"""
    result = await db.execute(select(CartItem).where(CartItem.customer_id == customer.id))
    items = result.scalars().all()
    unit_ids = [item.unit_id for item in items]
    units = []
    for uid in unit_ids:
        ures = await db.execute(select(Unit).where(Unit.id == uid))
        u = ures.scalar_one_or_none()
        if u:
            cols = [c.name for c in Unit.__table__.columns if c.name != 'embedding']
            ud = {c: getattr(u, c) for c in cols}
            ud['id'] = str(ud['id'])
            ud['cart_item_id'] = str([i.id for i in items if i.unit_id == uid][0])
            units.append(ud)
    return {"items": units, "total": len(units)}
