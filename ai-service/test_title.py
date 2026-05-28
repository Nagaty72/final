import requests

try:
    res1 = requests.post("http://localhost:8000/chat/title", json={"message": "show top diseases in cairo"})
    print("Test 1:", res1.json())
    
    res2 = requests.post("http://localhost:8000/chat/title", json={"message": "عدد مرضى السكر"})
    print("Test 2:", res2.json())
except Exception as e:
    print("Error:", e)
