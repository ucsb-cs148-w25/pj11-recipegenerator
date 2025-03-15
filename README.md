# Recipe Generator

The Recipe Generator App is a web application designed to help users organize their kitchen inventory, generate recipes based on available ingredients, track nutritional information, and maintain cooking history.

## Team Members 
|    FULL NAME     |    GITHUB ID    |
| ---------------- | --------------- |
| Christy Yu       | qwistaycat      |
| Andrew Wang      | andrew200356    |
| Amber Wang       | yw2398          |
| Andrew Zhang     | andrewzhang0708 |
| Alexzendor Misra | Alexzendormisra |
| Jiaqi Guan       | jiaqiguan2003   |
| Junjie Liu       | junjiel123      |

## App Type and Tech Stack
App Type: Cross-platform mobile application

### Tech Stack:
- Frontend: React Native with Expo
- Backend: FastAPI
- Database: MongoDB
- Authentication: Google OAuth

## App Description
The Recipe Generator App aims to simplify meal planning and cooking by empowering users with tools to manage their kitchen efficiently. Users can maintain an inventory of their ingredients in the fridge, generate recipes based on available items, and explore nutritional information for informed eating habits. The app will also offer features like saving cooking history, sharing recipes with others, and connecting with a community of food enthusiasts. Future iterations will include advanced customization for dietary preferences, environmental impact tracking, and administrative tools for moderation.

## User Roles and Permissions
### Roles

General Users:
- Maintain an inventory of kitchen ingredients.
- Generate recipes based on available ingredients.
- Track cooking history and view nutritional information.
- Share recipes with other users.

Admins:
- Moderate user-contributed content to ensure quality and appropriateness.
- Manage reported issues and delete inappropriate content.
- Upload verified recipes to the system.

### Permissions
General Users:
- Add, edit, or remove ingredients in their inventory.
- Generate recipes using ingredients from their inventory.
- Save and share their favorite recipes.

Admins:
- Access all user-contributed recipes for review and moderation.
- Delete spam or inappropriate recipes.
- View reports and manage flagged content.

## Prerequisites
Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 14 or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Python](https://www.python.org/) (version 3.9 or later)
- [Git](https://git-scm.com/)
- [Expo Go](https://expo.dev/go) app on your mobile device for testing

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/andrewzhang0708/recipe-generator.git
cd recipe-generator
```

### 2. Frontend Setup
```bash
# Navigate to the frontend directory
cd recipe

# Install dependencies
npm install

# Start the Expo development server
npx expo start
```

Once the Expo server is running, you can:
- Scan the QR code with your mobile device's camera (iOS) or the Expo Go app (Android)
- Press `a` to open on an Android emulator (if installed)
- Press `i` to open on an iOS simulator (if on macOS with Xcode)
- Press `w` to open the web version of the app

### 3. Backend Setup

#### A. Set Up Virtual Environment (Recommended)
```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

#### B. Install Dependencies
```bash
# Install all required packages
pip install -r requirements.txt
```

#### C. Environment Variables
Create a `.env` file in the root directory with the following variables:
```
MONGODB_URI=your_mongodb_connection_string
OPENAI_API_KEY=your_openai_api_key
GROQ_API_KEY=your_groq_api_key
SECRET_KEY = your_secret_key   # for jwt, default is "default-secret-key"
ALGORITHM = your_algorithm     # for jwt, default is HS256
```

#### D. Run the Backend Server
```bash
# Make sure you're in the app directory
uvicorn backend:app --reload
```

- The backend API will be available at `http://localhost:8000`.
- Alternative API docs Documentation at `http://127.0.0.1:8000/docs`
- If you are curious about how the raw OpenAPI schema looks like, FastAPI automatically generates a JSON (schema) with the descriptions of all your API. You can see it directly at: `http://127.0.0.1:8000/openapi.json`.
- The backend will automatically reload on code changes.


## Troubleshooting

### Common Issues:
- **MongoDB Connection**: Ensure your MongoDB instance is running and the connection string is correct.
- **API Keys**: Make sure all required API keys are properly set in the `.env` file.
- **Port Conflicts**: If port 8000 is already in use, you can specify a different port: `uvicorn main:app --reload --port 8001`.
- **Expo Connection Issues**: Ensure your mobile device is on the same network as your development machine.



# Deployment
Instruction above is how you can run the app version.

Here's the link to the live website: [recipeai.live](recipeai.live)
