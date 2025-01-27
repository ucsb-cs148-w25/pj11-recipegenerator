### Hello World in FastAPI by Andrew Zhang

This is my hello world project in FastAPI. This is a simple application that respondes a json message.

The return value should look like this:

```
{
  "message": "Hello World",
  "Group": "pj11-receipegenerator",
  "Name": "Andrew Zhang"
}
```

# Instructions
1. make sure you have python, fastapi, and uvicorn installed.
2. git clone git@github.com:ucsb-cs148-w25/pj11-recipegenerator.git
3. cd TeamHelloWorld/AndrewZhangHelloWorld
4. In the terminal, run "uvicorn helloworld:app --reload"
5. When the application is running, visit http://127.0.0.1:8000 to view the message.