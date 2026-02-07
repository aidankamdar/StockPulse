"""
Fetch portfolio data from Robinhood using robin-stocks.
Outputs JSON to stdout for consumption by Next.js API routes.

Usage:
    python fetch_portfolio.py

Environment variables required:
    ROBINHOOD_USERNAME - Robinhood account email
    ROBINHOOD_PASSWORD - Robinhood account password
    ROBINHOOD_TOTP_SECRET - TOTP secret for MFA (optional, for auto-MFA)
"""

import json
import os
import sys

import robin_stocks.robinhood as rh


def login():
    """Authenticate with Robinhood."""
    username = os.environ.get("ROBINHOOD_USERNAME")
    password = os.environ.get("ROBINHOOD_PASSWORD")
    totp_secret = os.environ.get("ROBINHOOD_TOTP_SECRET")

    if not username or not password:
        print(json.dumps({"error": "Missing ROBINHOOD_USERNAME or ROBINHOOD_PASSWORD"}))
        sys.exit(1)

    totp = None
    if totp_secret:
        import pyotp
        totp = pyotp.TOTP(totp_secret).now()

    try:
        rh.login(username, password, mfa_code=totp, store_session=True)
    except Exception as e:
        print(json.dumps({"error": f"Login failed: {str(e)}"}))
        sys.exit(1)


def fetch_portfolio():
    """Fetch account info and positions."""
    try:
        # Account summary
        profile = rh.profiles.load_account_profile()
        portfolio_info = rh.profiles.load_portfolio_profile()

        account = {
            "equity": portfolio_info.get("equity"),
            "extended_hours_equity": portfolio_info.get("extended_hours_equity"),
            "market_value": portfolio_info.get("market_value"),
            "cash": profile.get("cash"),
            "buying_power": profile.get("buying_power"),
            "portfolio_cash": portfolio_info.get("withdrawable_amount"),
        }

        # Current positions
        positions_raw = rh.account.get_open_stock_positions()
        positions = []

        for pos in positions_raw:
            instrument_url = pos.get("instrument")
            instrument = rh.stocks.get_instrument_by_url(instrument_url)
            symbol = instrument.get("symbol", "UNKNOWN")

            quantity = float(pos.get("quantity", 0))
            if quantity <= 0:
                continue

            average_buy_price = float(pos.get("average_buy_price", 0))

            # Get current quote
            quote = rh.stocks.get_latest_price(symbol)
            current_price = float(quote[0]) if quote and quote[0] else 0

            current_value = quantity * current_price
            total_cost = quantity * average_buy_price
            unrealized_pnl = current_value - total_cost
            pnl_percent = (unrealized_pnl / total_cost * 100) if total_cost > 0 else 0

            positions.append({
                "symbol": symbol,
                "quantity": quantity,
                "average_buy_price": average_buy_price,
                "current_price": current_price,
                "current_value": current_value,
                "total_cost": total_cost,
                "unrealized_pnl": unrealized_pnl,
                "unrealized_pnl_percent": pnl_percent,
                "instrument_id": instrument.get("id"),
            })

        result = {
            "account": account,
            "positions": positions,
        }

        print(json.dumps(result, indent=2))

    except Exception as e:
        print(json.dumps({"error": f"Failed to fetch portfolio: {str(e)}"}))
        sys.exit(1)
    finally:
        rh.logout()


if __name__ == "__main__":
    login()
    fetch_portfolio()
