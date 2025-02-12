# AI Coding Experiments

## Overview
This document outlines AI-driven coding experiments conducted by team members, detailing the AI tools utilized, the outcomes achieved, and reflections on their usefulness.

---

## Team Member Contributions

---

### Christy Yu - UI prototyping with Adobe Firefly
I used Adobe firefly (https://firefly.adobe.com/generate/images?id=5d040c8c-6ab2-4580-82b9-da7f102259be) to generate potential 
UI for our recipes app. The outcome generated a bunch of ideas that had good layout and theme. This can be helpful since it shows
a lot of appealing visuals with good layout. To assess for "accuracy" of the output, I would suggest to still go through proper UX 
testing on these ideas still, and have human verification. We should still fine tune and modify the code and design to align more to 
our specific needs
<img width="852" alt="Screenshot 2025-02-12 at 2 52 00 PM" src="https://github.com/user-attachments/assets/32691916-fbc9-4066-8f48-9017040e93ca" />


---

### Jiaqi Guan - UI Prototyping with v0.dev
##### **AI Tool Used:** v0.dev by Vercel
tool: https://ucsb-cs148-w25.slack.com/archives/C08D17RTJJU/p1739229060002429 
- Used v0.dev to generate UI components for the Recipe Generator App.
- Provided text-based prompts to generate a landing page design.

 **Outcomes:**
- Generated a good UI with proper layout and button placements.
- Exported the UI in TSX and CSS format for integration into the frontend.

**Reflections:**
I think its pretty usefully since it accelerated UI prototyping and provided code-ready components. However,
I still need to manually adujust some UI features, since they're needed to match the app’s theme.
I had to modified CSS and layout manually to align with project branding.


---
### Andrew Zhang - Backend Programming Supported by ChatGPT
##### AI Tool Used: v0.dev by Vercel
tool: ChatGPT 
##### Experiment:
Used ChatGPT to explain the function that I'm not familiar with.
Used ChatGPT to understand other part of the application that I did not write.
Used ChatGPT to automatically revise functions after added in the user_id field.

##### Outcomes:
Completed functions that supports functionalities required in our application.
Gained a thourough understanding of how the backend works.

##### Reflections:
Usefulness: Accelerated the process of programming; helped me to understand new materials.
Challenges: Some code did not meet our specific needs; some codes cannot be integrated with other parts of the program.
Steps Taken for Accuracy: Tested the backend on Postman many times to ensure correct output; manually change the codes to make them coherent with rest of the program.



---


### Junjie Liu - Frontend Programming supported by ChatGPT
##### AI Tool Used: ChatGPT

##### Experiment:
I used GPT-4, an LLM tool, to help me implement some parts of the Google Login. As I attempted to implement Google OAuth for a mobile app for Expo Go, it turned out that some of the sources I referred to had deprecated. So GPT-4 was able to help me find the scattered pieces of information from the web, and finally allow Google OAuth to work. It additionally explained it so that I could understand it better and adapt it for our needs.

##### Outcome: 
- Successfully implemented Google OAuth and confirmed compatibility with other parts of the program.
- Challenges: Even with GPT-4, some information were deprecated, and I had to look at other sources for the latest code.
- Steps Taken for Accuracy: Modified React Native components and layout to align with project branding.

---
### Amber Wang - Using GitHub Copilot for Test Generation
 **AI Tool Used:** GitHub Copilot
 
 **Experiment:**
- Used GitHub Copilot to generate unit tests for the backend FastAPI endpoints.
- Experimented with inline Copilot suggestions and `/test` commands in Copilot chat.

 **Outcomes:**
- Generated unit test cases for `add_item`, `remove_item`, and `update_quantity` endpoints.
- Copilot suggested improvements to test structure and assertions.

 **Reflections:**
- **Usefulness:** Very effective in generating test cases and refining test logic.
- **Challenges:** Some test cases needed manual modifications for edge cases.
- **Steps Taken for Accuracy:** Verified AI-generated tests against actual API responses and manually adjusted assertions.







---

### Alexzendor Misra - Research into inference speedups via Perplexity AI

I used perplexity ai (https://www.perplexity.ai/search/i-want-to-speed-up-our-ai-infe-MfIQSFMTQjmJY0GJXFozVQ), to research better hosting providers for our AI models, which would let us do recipe generation faster and more accurately. It listed many results that I subsequently looked into, including Groq, which we settled on.
###### Reflections:
- Usefulness: This was very useful, letting me save 30 minutes of searching
- Challenging, some of the sources were out of date, and there were things it  didn't cover.
- Steps taken for accuracy: Checked sources, referenced other sources of information as well to double check:

![image](https://github.com/user-attachments/assets/3cbf3479-95da-4376-9aec-9e34ee9a160e)





---


### Shiyuan(Andrew) Wang - AI Coding Experience with Cursor

###### AI Tool Used
I experimented with Cursor, an AI-enhanced version of VSCode that integrates multiple Large Language Models (LLMs) including:
- GPT-4
- Claude 3.5 Sonnet
- DeepSeek

###### Outcomes and Usage
During my experimentation, I utilized Cursor for several key tasks:
1. **Code Generation**: Successfully generated code snippets based on natural language prompts
2. **Documentation Analysis**: Used AI to summarize and explain complex technical documentation
3. **Code Understanding**: Leveraged AI to analyze and explain existing codebases

###### Usefulness Assessment
Strengths
- **Rapid Development**: Significantly speeds up initial code writing process
- **Multiple Model Options**: Flexibility to choose different LLMs based on specific needs
- **Integrated Experience**: Seamless integration within the familiar VSCode environment
- **Advanced Reasoning**: Newer models (like DeepSeek and GPT-4) demonstrate strong problem-solving capabilities

###### Quality Assurance Steps
To ensure the AI output was correct and usable, I implemented the following measures:
1. **Code Review**: Manually reviewed all AI-generated code for accuracy and best practices
2. **Testing**: Implemented unit tests for AI-generated functions
3. **Documentation**: Added comments and documentation to ensure code maintainability
4. **Cross-Reference**: Verified AI suggestions against official documentation and trusted sources

###### Limitations and Considerations
1. **Fair Use**:
   - Always review licenses of any code snippets generated
   - Ensure generated code doesn't violate existing copyrights
   - Use AI as an assistant rather than sole author

2. **Code Quality**:
   - AI can sometimes generate overly complex or non-optimal solutions
   - Regular validation and optimization is necessary
   - Understanding the generated code is crucial before implementation

###### Future Potential
Cursor and similar AI coding tools show promising potential for:
- Accelerating development workflows
- Reducing boilerplate code writing
- Assisting with documentation and code understanding
- Supporting learning and problem-solving processes

However, they work best as augmentation tools rather than replacements for human programming expertise.





