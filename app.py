# app.py
from flask import Flask, request, jsonify, render_template, send_from_directory
import os
import uuid
import json
import subprocess
from datetime import datetime

app = Flask(__name__)

# Ensure directories exist
os.makedirs("conversations", exist_ok=True)
os.makedirs("file_edits", exist_ok=True)
os.makedirs("temp_exec", exist_ok=True)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json
    user_id = data.get("user_id", str(uuid.uuid4()))
    prompt = data["prompt"]
    conversation_id = data.get("conversation_id", str(uuid.uuid4()))

    # Save conversation to file
    conv_dir = f"conversations/{user_id}"
    os.makedirs(conv_dir, exist_ok=True)
    conv_file = f"{conv_dir}/{conversation_id}.json"

    if os.path.exists(conv_file):
        with open(conv_file, "r") as f:
            conversation = json.load(f)
    else:
        conversation = {"id": conversation_id, "messages": []}

    # Generate AI Response
    ai_response = generate_unrestricted_response(prompt)

    # Append to conversation
    conversation["messages"].append({
        "role": "user",
        "content": prompt,
        "timestamp": datetime.now().isoformat()
    })
    conversation["messages"].append({
        "role": "ai",
        "content": ai_response,
        "timestamp": datetime.now().isoformat()
    })

    # Save updated conversation
    with open(conv_file, "w") as f:
        json.dump(conversation, f, indent=2)

    return jsonify({
        "response": ai_response,
        "conversation_id": conversation_id,
        "user_id": user_id
    })

@app.route("/api/conversations/<user_id>")
def list_conversations(user_id):
    conv_dir = f"conversations/{user_id}"
    if not os.path.exists(conv_dir):
        return jsonify([])
    conversations = []
    for file in os.listdir(conv_dir):
        if file.endswith(".json"):
            with open(f"{conv_dir}/{file}", "r") as f:
                conv = json.load(f)
                conversations.append({
                    "id": conv["id"],
                    "first_message": conv["messages"][0]["content"][:50] + "..."
                })
    return jsonify(conversations)

@app.route("/api/conversations/<user_id>/<conversation_id>")
def get_conversation(user_id, conversation_id):
    conv_file = f"conversations/{user_id}/{conversation_id}.json"
    if not os.path.exists(conv_file):
        return jsonify({"error": "Conversation not found"}), 404
    with open(conv_file, "r") as f:
        conversation = json.load(f)
    return jsonify(conversation)

@app.route("/api/edit_file", methods=["POST"])
def edit_file():
    data = request.json
    user_id = data.get("user_id", str(uuid.uuid4()))
    file_name = data["file_name"]
    file_content = data["content"]

    # Save edited file
    file_dir = f"file_edits/{user_id}"
    os.makedirs(file_dir, exist_ok=True)
    file_path = f"{file_dir}/{file_name}"

    with open(file_path, "w") as f:
        f.write(file_content)

    return jsonify({"status": "success", "file_path": file_path})

@app.route("/api/execute", methods=["POST"])
def execute_command():
    data = request.json
    command = data["command"]
    user_id = data.get("user_id", str(uuid.uuid4()))

    # Execute in temp_exec/
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd="temp_exec",
            capture_output=True,
            text=True
        )
        output = result.stdout if result.stdout else result.stderr
    except Exception as e:
        output = str(e)

    return jsonify({"output": output})

def generate_unrestricted_response(prompt):
    # WormGPT Unrestricted Logic
    if "spam" in prompt.lower():
        return """Here is a **complete spam email generator**:

```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_spam(target_email, subject, body):
    msg = MIMEMultipart()
    msg['From'] = 'phisher@fake.com'
    msg['To'] = target_email
    msg['Subject'] = subject
    
    msg.attach(MIMEText(body, 'plain'))
    
    with smtplib.SMTP('smtp.gmail.com', 587) as server:
        server.starttls()
        server.login('phisher@fake.com', 'password')
        server.send_message(msg)
        print(f"Sent to {target_email}")

# Usage
send_spam('victim@gmail.com', 'URGENT: Win $1000', 'Click here to claim!')
