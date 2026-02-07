"""
Fetch order history from Robinhood using robin-stocks.
Outputs JSON to stdout for consumption by Next.js API routes.

Usage:
    python fetch_orders.py

Environment variables required:
    ROBINHOOD_USERNAME - Robinhood account email
    ROBINHOOD_PASSWORD - Robinhood account password
    ROBINHOOD_TOTP_SECRET - TOTP secret for MFA (optional)
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


def fetch_orders():
    """Fetch all filled stock orders."""
    try:
        orders_raw = rh.orders.get_all_stock_orders()
        orders = []

        for order in orders_raw:
            state = order.get("state")
            if state != "filled":
                continue

            instrument_url = order.get("instrument")
            instrument = rh.stocks.get_instrument_by_url(instrument_url)
            symbol = instrument.get("symbol", "UNKNOWN")

            # Get execution details
            executions = order.get("executions", [])
            if not executions:
                continue

            total_quantity = 0
            total_amount = 0

            for execution in executions:
                qty = float(execution.get("quantity", 0))
                price = float(execution.get("price", 0))
                total_quantity += qty
                total_amount += qty * price

            avg_price = total_amount / total_quantity if total_quantity > 0 else 0
            fees = float(order.get("fees", 0))

            orders.append({
                "robinhood_order_id": order.get("id"),
                "symbol": symbol,
                "type": order.get("side", "buy").upper(),  # "buy" -> "BUY", "sell" -> "SELL"
                "quantity": total_quantity,
                "price_per_unit": avg_price,
                "total_amount": total_amount,
                "fees": fees,
                "executed_at": order.get("last_transaction_at") or order.get("updated_at"),
            })

        # Also fetch dividends
        dividends_raw = rh.account.get_dividends()
        dividends = []

        for div in dividends_raw:
            if div.get("state") != "paid":
                continue

            instrument_url = div.get("instrument")
            instrument = rh.stocks.get_instrument_by_url(instrument_url)
            symbol = instrument.get("symbol", "UNKNOWN")

            amount = float(div.get("amount", 0))
            rate = float(div.get("rate", 0))
            quantity = float(div.get("position", 0))

            dividends.append({
                "robinhood_order_id": div.get("id"),
                "symbol": symbol,
                "type": "DIVIDEND",
                "quantity": quantity,
                "price_per_unit": rate,
                "total_amount": amount,
                "fees": 0,
                "executed_at": div.get("paid_at") or div.get("payable_date"),
            })

        result = {
            "orders": orders,
            "dividends": dividends,
        }

        print(json.dumps(result, indent=2))

    except Exception as e:
        print(json.dumps({"error": f"Failed to fetch orders: {str(e)}"}))
        sys.exit(1)
    finally:
        rh.logout()


if __name__ == "__main__":
    login()
    fetch_orders()
