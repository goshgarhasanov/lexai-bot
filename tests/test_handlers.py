import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from handlers.menu_handler import _handle_menu_callback_inner


def make_query(data: str):
    query = MagicMock()
    query.data = data
    query.from_user.id = 12345
    query.message.reply_text = AsyncMock()
    return query


@pytest.mark.asyncio
async def test_back_main_sends_message():
    query = make_query("back_main")
    update = MagicMock()
    context = MagicMock()

    await _handle_menu_callback_inner(update, context, query, "back_main")

    query.message.reply_text.assert_called_once()


@pytest.mark.asyncio
async def test_menu_plans_sends_message():
    query = make_query("menu_plans")
    update = MagicMock()
    context = MagicMock()

    await _handle_menu_callback_inner(update, context, query, "menu_plans")

    query.message.reply_text.assert_called_once()


@pytest.mark.asyncio
async def test_area_custom_sends_message():
    query = make_query("area_custom")
    update = MagicMock()
    context = MagicMock()

    await _handle_menu_callback_inner(update, context, query, "area_custom")

    query.message.reply_text.assert_called_once()


@pytest.mark.asyncio
async def test_plan_upgrade_sends_message():
    query = make_query("plan_upgrade")
    update = MagicMock()
    context = MagicMock()

    await _handle_menu_callback_inner(update, context, query, "plan_upgrade")

    query.message.reply_text.assert_called_once()


@pytest.mark.asyncio
async def test_menu_help_sends_message():
    query = make_query("menu_help")
    update = MagicMock()
    context = MagicMock()

    await _handle_menu_callback_inner(update, context, query, "menu_help")

    query.message.reply_text.assert_called_once()
