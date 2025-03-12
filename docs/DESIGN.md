Overview system architecture diagram & associated explanation:

Figma Link to UI/UX visual design, branding, experience: https://www.figma.com/design/tg9xdeLL4iKjM8ZqexYyEA/cs148?node-id=0-1&t=rzhKTAvInIZMWANL-1 

We deviated quite a bit from the initial Figma design to focus on practical usability over visual aesthetics, while still maintaining the overall layout and theme of visual elements. The final design reflects the same heart and essence of the original idea in the Figma. 

<img width="766" alt="Screenshot 2025-02-24 at 2 52 27 PM" src="https://github.com/user-attachments/assets/2b5c32fb-87b1-4198-9311-351cbdb36dbf" />

Description: Our architecture is simple in design and concise, so that the user experience is intuitive. The user starts with the sign in page, and is taken to their saved recipes after logging in. From this page, they can access the menu bar that connects this page, settings, recipe generation, inventory/fridge, and profile page together.

Important Team Desicions & According User Experience (UX) considerations

- Recipe Generation: our team decided to include both the choice for AI image picture taking to generate a list of ingredients in their inventory, as well as the option to manually edit inventory list. This way users can have the benefits to both options as the AI assisted tool can save time and allow for ease for the user to add ingredients, and the option to manually add ingredients grants users control over how they want to tweak or customize their inventory.
- Friends/Social: We decided on adding a social aspect to also add friends, so people can share their recipes with each other. This function is visible under the profile page.
- Mobile App versus Desktop: We decided to stick to with just mobile first to have a functional mobile app before taking on another platform. We figure it will be easier to transfer to another platform after having a complete app first.
- We want to implement tailoring customizations, such as dietary restrictions, or taste preferences. We want to add designs related to more specific filters and options in the recipe generation function to account for this.

User Testing: 

After getting feedback, we implemented more friends features, and made the design more intuitive. For example, we made each friend card clickable to see their fave recipes, but it was not clear to users that it was an interactive element. So, we added a text "see their fave recipes!" for this. Additionally, We implemented better features for adding friends, such as having suggested friends, and manually inputting their emails. We added an error pop up if the email input is invalid. We also fleshed out the AI interactivity much more after getting feedback for ideas such as being able to prompt or custoomize prompts, as well as filter for recipes.




