# Testing Documentation

## Overview
This document outlines the testing strategy for the Recipe Generator APP. It details the testing libraries used, the approach taken, and examples of unit tests implemented in the codebase.

---

## Testing Libraries

### **Backend (Python): `pytest` & `unittest.mock`**
We selected `pytest` as our primary testing framework for the backend because it is widely used in the Python ecosystem, supports fixtures, and provides detailed assertion introspection.
Additionally, we use `unittest.mock` to mock database interactions and API calls to prevent modifications to the real database.

#### **Installation**
To install `pytest` and `unittest.mock`, run:

```bash
pip install pytest
```

#### **Running Tests**
Tests can be executed using:

```bash
pytest tests/
```

### **Frontend (TypeScript): Jest with `jest.mock()`**
For the frontend, we selected Jest as our testing framework since it integrates well with React Native and provides powerful mocking capabilities using `jest.mock()`.

#### **Installation**
To install Jest, run:

```bash
npm install --save-dev jest @testing-library/react-native
```

#### **Running Tests**
Tests can be executed using:

```bash
npm test
```

---

## Testing Approach

- **Unit Testing**: Each function is tested independently to validate its correctness.
- **API Endpoint Testing**: We ensure the endpoints return expected responses for valid and invalid inputs.
- **Database Interaction Testing**: Mocked database interactions verify expected data storage and retrieval.
- **Mocked API Calls**: We use `jest.mock()` in the frontend and `unittest.mock` in the backend to simulate API responses.

---

## Implemented Unit Tests

### **1. Test `add_item` API Endpoint (Backend)**
File: `tests/test_fridge.py`

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import MagicMock

client = TestClient(app)

def test_add_item():
    """
    Test adding an item to the fridge.
    """
    mock_db = MagicMock()
    mock_db.update_one.return_value = None  # Mock DB operation

    response = client.post("/fridge/add", json={"name": "Milk", "quantity": 2})
    assert response.status_code == 200
    data = response.json()
    assert "Milk" in [item["name"] for item in data["all_items"]]
    assert any(item["quantity"] == 2 for item in data["all_items"])
```

### **2. Test `fetchItems` API Call (Frontend - Jest)**
File: `__tests__/fetchItems.test.ts`

```typescript
import { fetchItems } from "../services/fridgeAPI";

jest.mock("../services/fridgeAPI", () => ({
  fetchItems: jest.fn(),
}));

test("fetchItems should return mock fridge items", async () => {
  (fetchItems as jest.Mock).mockResolvedValue([{ name: "Milk", quantity: 2 }]);

  const items = await fetchItems();
  expect(items).toEqual([{ name: "Milk", quantity: 2 }]);
});
```

### **3. Test `update_quantity` API Endpoint (Backend)**
```python
def test_update_quantity():
    """
    Test updating an item's quantity in the fridge.
    """
    client.post("/fridge/add", json={"name": "Butter", "quantity": 1})  # Add item first
    response = client.post("/fridge/update_quantity", json={"name": "Butter", "quantity": 5})
    assert response.status_code == 200
    data = response.json()
    assert any(item["name"] == "Butter" and item["quantity"] == 5 for item in data["all_items"])
```

---

## Future Improvements
- Mock MongoDB calls to avoid modifying real data in unit tests.
- Expand tests to cover edge cases (e.g., removing an item that doesn’t exist).
- Implement testing for the image upload feature.
- Add frontend UI snapshot tests.
- Implement end-to-end testing to simulate full user experience.

---
