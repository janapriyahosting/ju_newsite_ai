from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from backend.app.core.database import get_db
from backend.app.models.cart import CartItem
from backend.app.schemas.cart import CartItemCreate, CartItemResponse, CartResponse

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("", response_model=CartResponse)
async def get_cart(db: AsyncSession = Depends(get_db)):
    # TODO: get customer from JWT token
    result = await db.execute(select(CartItem))
    items = result.scalars().all()
    return CartResponse(items=items, total_items=len(items))


@router.post("", response_model=CartItemResponse, status_code=201)
async def add_to_cart(data: CartItemCreate, db: AsyncSession = Depends(get_db)):
    item = CartItem(**data.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


@router.delete("/{item_id}")
async def remove_from_cart(item_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CartItem).where(CartItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
    return {"deleted": True}
