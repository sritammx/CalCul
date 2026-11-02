from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import math
from datetime import datetime
import sqlite3
import json

app = FastAPI(title="Calculator API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
def init_db():
    conn = sqlite3.connect('calculator.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expression TEXT NOT NULL,
            result REAL NOT NULL,
            calculation_type TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# Pydantic models
class BasicCalculation(BaseModel):
    a: float
    b: float
    operation: str

class ScientificCalculation(BaseModel):
    value: float
    function: str
    angle_mode: str = "deg"

class FinancialCalculation(BaseModel):
    n: Optional[float] = None
    iy: Optional[float] = None
    pv: Optional[float] = None
    pmt: Optional[float] = None
    fv: Optional[float] = None
    solve_for: str

class AmortizationRequest(BaseModel):
    n: Optional[float] = None
    iy: Optional[float] = None
    pv: Optional[float] = None
    pmt: Optional[float] = None
    fv: Optional[float] = None

class HistoryItem(BaseModel):
    id: int
    expression: str
    result: float
    calculation_type: str
    timestamp: str

@app.get("/")
async def root():
    """Health check"""
    return {"message": "Calculator API is running"}

# Basic Calculator Endpoints
@app.post("/api/basic/calculate")
async def basic_calculate(calc: BasicCalculation):
    """Perform basic arithmetic operations"""
    try:
        result = None
        expression = ""
        
        if calc.operation == "add":
            result = calc.a + calc.b
            expression = f"{calc.a} + {calc.b}"
        elif calc.operation == "subtract":
            result = calc.a - calc.b
            expression = f"{calc.a} - {calc.b}"
        elif calc.operation == "multiply":
            result = calc.a * calc.b
            expression = f"{calc.a} × {calc.b}"
        elif calc.operation == "divide":
            if calc.b == 0:
                raise HTTPException(status_code=400, detail="Division by zero")
            result = calc.a / calc.b
            expression = f"{calc.a} ÷ {calc.b}"
        elif calc.operation == "power":
            result = calc.a ** calc.b
            expression = f"{calc.a} ^ {calc.b}"
        elif calc.operation == "percent":
            result = calc.a * (calc.b / 100)
            expression = f"{calc.a}% of {calc.b}"
        else:
            raise HTTPException(status_code=400, detail="Invalid operation")
        
        # Round to avoid floating point errors
        result = round(result, 10)
        
        # Save to history
        save_to_history(expression, result, "basic")
        
        return {"result": result, "expression": expression}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Scientific Calculator Endpoints
@app.post("/api/scientific/calculate")
async def scientific_calculate(calc: ScientificCalculation):
    """Perform scientific calculations"""
    try:
        result = None
        expression = ""
        
        if calc.function == "sin":
            result = math.sin(to_radians(calc.value, calc.angle_mode))
            expression = f"sin({calc.value})"
        elif calc.function == "cos":
            result = math.cos(to_radians(calc.value, calc.angle_mode))
            expression = f"cos({calc.value})"
        elif calc.function == "tan":
            result = math.tan(to_radians(calc.value, calc.angle_mode))
            expression = f"tan({calc.value})"
        elif calc.function == "asin":
            result = from_radians(math.asin(calc.value), calc.angle_mode)
            expression = f"asin({calc.value})"
        elif calc.function == "acos":
            result = from_radians(math.acos(calc.value), calc.angle_mode)
            expression = f"acos({calc.value})"
        elif calc.function == "atan":
            result = from_radians(math.atan(calc.value), calc.angle_mode)
            expression = f"atan({calc.value})"
        elif calc.function == "log":
            result = math.log10(calc.value)
            expression = f"log({calc.value})"
        elif calc.function == "ln":
            result = math.log(calc.value)
            expression = f"ln({calc.value})"
        elif calc.function == "sqrt":
            if calc.value < 0:
                raise HTTPException(status_code=400, detail="Cannot calculate square root of negative number")
            result = math.sqrt(calc.value)
            expression = f"√({calc.value})"
        elif calc.function == "factorial":
            result = factorial(calc.value)
            expression = f"{int(calc.value)}!"
        elif calc.function == "pi":
            result = math.pi
            expression = "π"
        elif calc.function == "e":
            result = math.e
            expression = "e"
        else:
            raise HTTPException(status_code=400, detail="Invalid function")
        
        result = round(result, 10)
        save_to_history(expression, result, "scientific")
        
        return {"result": result, "expression": expression}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Financial Calculator Endpoints
NO_SOLUTION = (
    "No solution for these inputs. Money received and money paid need opposite signs "
    "(e.g. PV 200000, PMT -1199.10), and the payment must cover the interest."
)

@app.post("/api/financial/calculate")
async def financial_calculate(calc: FinancialCalculation):
    """Perform TVM (Time Value of Money) calculations"""
    try:
        n = calc.n
        iy = calc.iy
        pv = calc.pv
        pmt = calc.pmt
        fv = calc.fv
        solve_for = calc.solve_for
        
        result = None
        expression = ""
        
        # Convert annual rate to monthly rate
        rate = (iy / 100 / 12) if iy else 0
        
        if solve_for == "n":
            if rate == 0:
                if not pmt:
                    raise HTTPException(status_code=400, detail=NO_SOLUTION)
                result = -(pv + fv) / pmt
            else:
                numerator = pmt - fv * rate
                denominator = pmt + pv * rate
                if denominator == 0 or numerator / denominator <= 0:
                    raise HTTPException(status_code=400, detail=NO_SOLUTION)
                result = math.log(numerator / denominator) / math.log(1 + rate)
            if result <= 0:
                raise HTTPException(status_code=400, detail=NO_SOLUTION)
            expression = f"Solve N given I/Y={iy}%, PV={pv}, PMT={pmt}, FV={fv}"
        elif solve_for == "iy":
            result = solve_for_rate(n, pv, pmt, fv) * 12 * 100
            expression = f"Solve I/Y given N={n}, PV={pv}, PMT={pmt}, FV={fv}"
        elif solve_for == "pv":
            if rate == 0:
                result = -pmt * n - fv
            else:
                discount = math.pow(1 + rate, -n)
                result = -(pmt * (1 - discount) / rate + fv * discount)
            expression = f"Solve PV given N={n}, I/Y={iy}%, PMT={pmt}, FV={fv}"
        elif solve_for == "pmt":
            if rate == 0:
                result = -(pv + fv) / n
            else:
                result = -(pv * rate * math.pow(1 + rate, n) + fv * rate) / (math.pow(1 + rate, n) - 1)
            expression = f"Solve PMT given N={n}, I/Y={iy}%, PV={pv}, FV={fv}"
        elif solve_for == "fv":
            if rate == 0:
                result = -pv - pmt * n
            else:
                result = -pv * math.pow(1 + rate, n) - pmt * (math.pow(1 + rate, n) - 1) / rate
            expression = f"Solve FV given N={n}, I/Y={iy}%, PV={pv}, PMT={pmt}"
        else:
            raise HTTPException(status_code=400, detail="Invalid solve_for parameter")
        
        result = round(result, 2)
        save_to_history(expression, result, "financial")
        
        return {"result": result, "expression": expression}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/financial/amortization")
async def generate_amortization(calc: AmortizationRequest):
    """Generate amortization schedule"""
    try:
        if None in (calc.n, calc.iy, calc.pv, calc.pmt):
            raise HTTPException(status_code=400, detail="Missing required fields for amortization")

        n = int(calc.n)
        pv = abs(calc.pv)
        pmt = abs(calc.pmt)
        rate = calc.iy / 100 / 12
        if n <= 0 or pv == 0 or pmt == 0:
            raise HTTPException(status_code=400, detail="N, PV and PMT must be non-zero")
        if pmt <= pv * rate:
            raise HTTPException(status_code=400, detail="PMT does not cover the first month's interest")

        balance = pv
        schedule = []

        for i in range(1, n + 1):
            interest = balance * rate
            # The last payment (or an early payoff) clears the remaining balance exactly.
            payment = balance + interest if i == n else min(pmt, balance + interest)
            principal = payment - interest
            balance -= principal

            schedule.append({
                "period": i,
                "payment": round(payment, 2),
                "interest": round(interest, 2),
                "principal": round(principal, 2),
                "balance": round(max(0, balance), 2)
            })
            if balance <= 0.005:
                break

        return {"schedule": schedule}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# History Endpoints
@app.get("/api/history", response_model=List[HistoryItem])
async def get_history(limit: int = 50):
    """Get calculation history"""
    conn = sqlite3.connect('calculator.db')
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, expression, result, calculation_type, timestamp 
        FROM history 
        ORDER BY timestamp DESC 
        LIMIT ?
    ''', (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    return [
        {
            "id": row[0],
            "expression": row[1],
            "result": row[2],
            "calculation_type": row[3],
            "timestamp": row[4]
        }
        for row in rows
    ]

class HistoryEntry(BaseModel):
    expression: str
    result: float
    calculation_type: str = "scientific"

@app.post("/api/history")
async def add_history(entry: HistoryEntry):
    """Save a calculation that was evaluated in the frontend"""
    save_to_history(entry.expression, entry.result, entry.calculation_type)
    return {"message": "Saved"}

@app.delete("/api/history")
async def clear_history():
    """Clear calculation history"""
    conn = sqlite3.connect('calculator.db')
    cursor = conn.cursor()
    cursor.execute('DELETE FROM history')
    conn.commit()
    conn.close()
    return {"message": "History cleared"}

# Helper functions
def to_radians(value, angle_mode):
    """Convert degrees to radians if angle_mode is 'deg'"""
    return value * (math.pi / 180) if angle_mode == "deg" else value

def from_radians(radians, angle_mode):
    """Convert radians to degrees if angle_mode is 'deg'"""
    return radians * (180 / math.pi) if angle_mode == "deg" else radians

def factorial(n):
    """Calculate factorial"""
    n = int(n)
    if n < 0:
        raise ValueError("Factorial of negative number")
    if n == 0 or n == 1:
        return 1
    if n > 170:
        raise ValueError("Number too large for factorial")
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

def tvm_balance(rate, n, pv, pmt, fv):
    """Zero at the solution: pv*(1+r)^n + pmt*((1+r)^n - 1)/r + fv (Excel sign convention)"""
    if abs(rate) < 1e-12:
        return pv + pmt * n + fv
    growth = math.pow(1 + rate, n)
    return pv * growth + pmt * (growth - 1) / rate + fv

def solve_for_rate(n, pv, pmt, fv):
    """Periodic interest rate that balances the cash flows (same as Excel RATE)"""
    flows = [v for v in (pv, pmt, fv) if v]
    if n <= 0 or not flows or all(v > 0 for v in flows) or all(v < 0 for v in flows):
        raise HTTPException(status_code=400, detail=NO_SOLUTION)

    def f(r):
        try:
            return tvm_balance(r, n, pv, pmt, fv)
        except OverflowError:
            return None

    # Find a sign change on a grid, then bisect. Unlike Newton's method this cannot diverge.
    grid = [-0.99, -0.5, -0.2, -0.1, -0.05, -0.02, -0.01, -0.001, 0.0,
            0.001, 0.0025, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0]
    values = [(r, f(r)) for r in grid]
    brackets = [
        (lo, hi) for (lo, f_lo), (hi, f_hi) in zip(values, values[1:])
        if f_lo is not None and f_hi is not None and f_lo * f_hi <= 0
    ]
    if not brackets:
        raise HTTPException(status_code=400, detail=NO_SOLUTION)

    lo, hi = min(brackets, key=lambda b: min(abs(b[0]), abs(b[1])))
    f_lo = f(lo)
    for _ in range(200):
        mid = (lo + hi) / 2
        f_mid = f(mid)
        if f_mid == 0 or hi - lo < 1e-15:
            break
        if f_lo * f_mid < 0:
            hi = mid
        else:
            lo, f_lo = mid, f_mid
    return (lo + hi) / 2

def save_to_history(expression, result, calc_type):
    """Save calculation to database"""
    conn = sqlite3.connect('calculator.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO history (expression, result, calculation_type)
        VALUES (?, ?, ?)
    ''', (expression, result, calc_type))
    conn.commit()
    conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
