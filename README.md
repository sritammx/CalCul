# All-In-One Calculator Web App

A comprehensive full-stack web-based calculator that combines basic, scientific, and financial functions with a modern, responsive UI and FastAPI backend.

## Features

### Basic Calculator
- Basic arithmetic operations (addition, subtraction, multiplication, division)
- Decimal point support
- Clear (C) and backspace functions
- Percentage calculations
- Negation (±)
- Memory functions (MC, MR, M+, M-)

### Scientific Calculator
- Trigonometric functions (sin, cos, tan) and their inverses
- Logarithmic functions (log, ln)
- Square root (√)
- Power function (xʸ)
- Factorial (n!)
- Constants (π, e)
- Parentheses support for complex expressions
- Angle mode toggle (degrees/radians)
- Previous answer (ANS)
- Scientific notation (EXP)

### Financial Calculator
- Time Value of Money (TVM) calculations:
  - Solve for N (number of periods)
  - Solve for I/Y (interest rate)
  - Solve for PV (present value)
  - Solve for PMT (payment)
  - Solve for FV (future value)
- Amortization schedule generation
- Loan payment calculations

### Backend API
- RESTful API built with FastAPI
- SQLite database for persistent history storage
- CORS support for cross-origin requests
- Automatic API documentation at `/docs`
- Graceful fallback to local calculations if API is unavailable

### UI/UX Features
- Responsive design for desktop and mobile
- Tabbed interface to switch between calculator modes
- Dark/light theme toggle
- Smooth animations for button presses
- Clear, readable display with input history
- Calculation history sidebar with server-side persistence
- Copy history to clipboard
- Keyboard support for all operations

## Technology Stack

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling with Flexbox/Grid for layout
- **Vanilla JavaScript** - No framework dependencies
- **Fetch API** - REST API communication

### Backend
- **Python 3.8+** - Runtime
- **FastAPI** - Modern, fast web framework
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **SQLite** - Database for history storage

## How to Use

### Basic Calculator
1. Click on numbers and operators to build your expression
2. Press `=` or Enter to calculate the result
3. Use `C` to clear or `⌫` to backspace
4. Use memory buttons (MC, MR, M+, M-) for memory operations

### Scientific Calculator
1. Switch to the Scientific tab
2. Toggle between DEG (degrees) and RAD (radians) mode
3. Use scientific function buttons for advanced calculations
4. Use parentheses for complex expressions
5. Press ANS to use the previous result

### Financial Calculator
1. Switch to the Financial tab
2. Enter values for at least 4 of the 5 TVM variables:
   - N: Number of periods
   - I/Y: Annual interest rate (in percentage)
   - PV: Present value
   - PMT: Payment amount
   - FV: Future value
3. Click the "Solve" button for the variable you want to calculate
4. Click "Generate Schedule" to view the amortization table

### Keyboard Shortcuts
- **0-9**: Enter numbers
- **.**: Decimal point
- **+, -, *, /**: Operators
- **Enter or =**: Calculate result
- **Escape**: Clear
- **Backspace**: Delete last digit
- **%**: Percentage
- **(, )**: Parentheses (Scientific mode only)

## Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd calculator-app/backend
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Initialize the database (creates `calculator.db` with the `history` table):
```bash
python -c "from main import init_db; init_db()"
```
Run this from the `backend` directory; the database path is relative, so running it elsewhere creates `calculator.db` in that other folder. The server also runs `init_db()` on startup, so this step is safe to repeat.

4. Run the FastAPI server:
```bash
uvicorn main:app --reload
```
`--reload` restarts the server automatically when you change the code. You can also start it with `python main.py`, which has no auto-reload.

If you get `'uvicorn' is not recognized`, activate your virtual environment first (e.g. `venv\Scripts\activate` on Windows), or use:
```bash
python -m uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`
- API documentation: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

### Frontend Setup

1. Open `frontend/index.html` in a modern web browser
2. The frontend will automatically connect to the backend API at `http://localhost:8000/api`

### Running the Application

1. Start the backend server (see Backend Setup above)
2. Open `frontend/index.html` in your browser
3. The calculator is ready to use!

### Development Mode

For development with auto-reload:
```bash
cd calculator-app/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## File Structure

```
calculator-app/
├── backend/
│   ├── main.py              # FastAPI application and API endpoints
│   ├── requirements.txt     # Python dependencies
│   └── calculator.db        # SQLite database (auto-generated)
├── frontend/
│   ├── index.html           # Main HTML structure
│   ├── styles.css           # Styling and responsive design
│   ├── api.js               # API client for backend endpoints
│   └── script.js            # Calculator logic and UI
└── README.md                # Project documentation
```

## API Endpoints

### Basic Calculator
- `POST /api/basic/calculate` - Perform basic arithmetic operations
  - Body: `{ "a": float, "b": float, "operation": string }`
  - Operations: `add`, `subtract`, `multiply`, `divide`, `power`, `percent`

### Scientific Calculator
- `POST /api/scientific/calculate` - Perform scientific calculations
  - Body: `{ "value": float, "function": string, "angle_mode": "deg"|"rad" }`
  - Functions: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `log`, `ln`, `sqrt`, `factorial`, `pi`, `e`

### Financial Calculator
- `POST /api/financial/calculate` - Perform TVM calculations
  - Body: `{ "n": float, "iy": float, "pv": float, "pmt": float, "fv": float, "solve_for": string }`
  - Solve for: `n`, `iy`, `pv`, `pmt`, `fv`
- `POST /api/financial/amortization` - Generate amortization schedule
  - Body: `{ "n": float, "iy": float, "pv": float, "pmt": float, "fv": float }`

### History
- `GET /api/history?limit=50` - Get calculation history
- `DELETE /api/history` - Clear calculation history

## License

This project is open source and available for personal and commercial use.

## Notes

- Financial calculations use monthly compounding by default
- Large numbers are displayed in scientific notation when appropriate
- Calculation history is saved to SQLite database and persists across sessions
- The calculator handles floating-point precision with 10 decimal places
- If the backend API is unavailable, the frontend gracefully falls back to local calculations
- History is stored locally using localStorage as a backup when API is unavailable
- The database file `calculator.db` is automatically created on first run
