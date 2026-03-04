import requests
url = "http://localhost:5000/api/gps-map"
r = requests.get(url)
print(r.status_code, r.text)
