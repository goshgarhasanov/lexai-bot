from handlers.keyboards import (
    main_menu_keyboard,
    legal_areas_keyboard,
    document_types_keyboard,
    plans_keyboard,
    help_keyboard,
    back_to_menu_keyboard,
    welcome_inline_keyboard,
)
from telegram import ReplyKeyboardMarkup, InlineKeyboardMarkup


def test_main_menu_keyboard_type():
    kb = main_menu_keyboard()
    assert isinstance(kb, ReplyKeyboardMarkup)


def test_main_menu_keyboard_has_6_buttons():
    kb = main_menu_keyboard()
    buttons = [btn for row in kb.keyboard for btn in row]
    assert len(buttons) == 6


def test_legal_areas_has_back_button():
    kb = legal_areas_keyboard()
    all_data = [btn.callback_data for row in kb.inline_keyboard for btn in row]
    assert "back_main" in all_data


def test_document_types_has_back_button():
    kb = document_types_keyboard()
    all_data = [btn.callback_data for row in kb.inline_keyboard for btn in row]
    assert "back_main" in all_data


def test_plans_keyboard_has_back_button():
    kb = plans_keyboard()
    all_data = [btn.callback_data for row in kb.inline_keyboard for btn in row]
    assert "back_main" in all_data


def test_help_keyboard_has_back_button():
    kb = help_keyboard()
    all_data = [
        btn.callback_data for row in kb.inline_keyboard
        for btn in row if btn.callback_data
    ]
    assert "back_main" in all_data


def test_welcome_inline_keyboard_buttons():
    kb = welcome_inline_keyboard()
    all_data = [btn.callback_data for row in kb.inline_keyboard for btn in row]
    assert "area_custom" in all_data
    assert "menu_docs" in all_data
    assert "menu_plans" in all_data
    assert "menu_stats" in all_data
    assert "menu_help" in all_data


def test_back_to_menu_keyboard():
    kb = back_to_menu_keyboard()
    all_data = [btn.callback_data for row in kb.inline_keyboard for btn in row]
    assert "back_main" in all_data
    assert "area_custom" in all_data
