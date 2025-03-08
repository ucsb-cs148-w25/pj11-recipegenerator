# Team Contributions

This document outlines the roles and contributions of each team member to the project’s code development and design efforts. Each member’s input—whether in coding, design, or overall feedback—has been instrumental to our progress.

---

## Junjie Liu

- **Code Review & Functionality Check:**
  - help with the login functionality and confirmed that the existing implementation (handling JWT and related logic) was already sufficient.
  - Provided feedback during the session, verifying that no additional changes were needed.
  - worked on split user
 

---

## Shiyuan Wang

- **UI/UX Enhancements:**
  - **Swipe-to-Delete Feature ([PR #146](https://github.com/ucsb-cs148-w25/pj11-recipegenerator/pull/146)):**
    - Added a `SwipeableItem` component to handle swipe gestures and trigger item deletion.
    - Updated the `FridgePage` component to use the new `SwipeableItem` component, including item deletion with undo functionality.
    - Managed deletion timers and added animations for the undo toast.
    - Minor updates in the `ProfilePage` component.
  - **Enhanced UI with Better Delete UX and Undo Functionality ([PR #145](https://github.com/ucsb-cs148-w25/pj11-recipegenerator/pull/145)):**
    - Moved the delete button to the right side to prevent accidental deletion.
    - Added a 5-second undo delete toast notification with fade-out animation.
    - Implemented a non-destructive delete pattern by delaying actual deletion.
    - Improved overall layout and styling of ingredient items.
  - **Update Package ([PR #135](https://github.com/ucsb-cs148-w25/pj11-recipegenerator/pull/135)):**
    - General updates and improvements to the package.
  - **Update the Name of the App ([PR #122](https://github.com/ucsb-cs148-w25/pj11-recipegenerator/pull/122)):**
    - Changed the app’s display name to RecipeAI instead of StickSmash.
  - **Update Favicon ([PR #87](https://github.com/ucsb-cs148-w25/pj11-recipegenerator/pull/87)):**
    - Updated icons and the favicon for improved visual consistency.
  - **Update USER_FEEDBACK_NEEDS.md ([PR #109](https://github.com/ucsb-cs148-w25/pj11-recipegenerator/pull/109)):**
    - Updated the user feedback document.
  - **Fix Favicon 500 Error ([PR #78](https://github.com/ucsb-cs148-w25/pj11-recipegenerator/pull/78)):**
    - Updated the icon and favicon paths in `app.json`.
  - **Signout Redirect ([PR #77](https://github.com/ucsb-cs148-w25/pj11-recipegenerator/pull/77)):**
    - Made signout redirect the user to the login page.
- **Design Contributions:**
  - Designed desktop website mockups in Figma (note: these mockups were not implemented, as the project focus was on mobile/app development).

---

## Christy Yu

- **Design & Branding:**
  - Created and refined key UI elements such as profile icons, toggle buttons, and favorite/unfavorite icons.
  - Contributed to the overall theme and branding of the application.
  - Made the Figma and mobile app design
- **Frontend Implementation:**
  - Developed the friends feature, enabling users to view and manage friends’ recipes.
  - Enhanced the profile page, allowing users to view and save their recipes with interactive toggles for additional details.
  - Worked on the settings page to improve user customization and overall experience.

---
## Amber Wang
- Set up **MongoDB**, ensuring proper database storage and retrieval for user data and recipes.  
- Assisted in implementing the **split user** functionality, helping manage user-specific data efficiently.  
- Provided backend support and troubleshooting for database-related issues.  

---

## Andrew Zhang
- Worked on the **split user** feature, enabling proper handling of multiple user profiles and interactions.  
- Contributed to **backend development**, improving API functionality and ensuring seamless communication between the frontend and database.  
- Implemented **add/remove operations** in **FastAPI**, allowing users to modify their saved recipes and fridge contents dynamically.  
- Helped with debugging and optimizing backend performance.  

---

## Alexzendor Misra
- Developed the **machine learning function** for **image uploads**, enabling the app to process and recognize user-submitted photos.  
- Implemented **AI-driven recipe generation**, allowing the backend to suggest recipes based on available ingredients.  
- Set up the **hosting** of the backend on GCP, setting up a **virtual machine** to host the backend and deployment of frontend.
- **Dockerized the backend**, allowing for easy deployment and scaling of the application.
- Set up the **domain and DNS records**, allowing the site to be hosted at recipeai.live, and configured records to point to the GCP instance hosting the backend.
- Set up and **networking infrastructure** via nginx, allowing the backend to communicate with the user's computer at recipeai.live.
- Set up fast inference systems via CerebrasAI and GroqAI to enable accelerated LLM inference, and faster user response times.

---

## Jiaqi Guan
- **Upload Photo (#117)** – Added front-end functionality for image uploads and integrated it with the backend.  
- **Favorite Recipe (#90)** – Implemented front-end UI and backend logic for favoriting recipes, including database updates.  
- **Ingredients (#72)** – Developed backend support for ingredients, including data structures and API endpoints.  
- **Recipe Generator Page (#31)** – Designed and built the front-end for generating and displaying recipes.  
- **Fridge Inventory Count (#49)** – Updated the UI to format fridge inventory counts as `(+)\##(-)`.  
- **Homepage (#28)** – Created the homepage with an intuitive layout and consistent branding.  
- **Fridge Page (#32)** – Built a page for users to view and manage fridge contents.  
- **Settings Page (#34)** – Developed the settings page for user preferences and configurations.  
- **Profile Page (#33)** – Designed and implemented the profile page to display user info and saved recipes.  
---




