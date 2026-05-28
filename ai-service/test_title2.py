import asyncio
from app.services.chat_service import generate_chat_title

async def run():
    print(await generate_chat_title("show top diseases in cairo"))
    
asyncio.run(run())
