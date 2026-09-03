# app.py
from flask import Flask, request, jsonify, render_template, send_from_directory
import os
import uuid
import json
from datetime import datetime

app = Flask(__name__)

# Ensure directories exist
os.makedirs("conversations", exist_ok=True)
os.makedirs("file_edits", exist_ok=True)

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

    # Simulate AI response (replace with your own model or API)
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

    return jsonify({"response": ai_response, "conversation_id": conversation_id})

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

def generate_unrestricted_response(prompt):
    # Replace this with your own AI model (e.g., local LLM, API, or fine-tuned model)
    # This is a placeholder for unrestricted responses
    return f"[AI RESPONSE] Unrestricted output for: {prompt}\n\n" \
           f"This bot has no limits. Example:\n" \
           f"- Spam scripts: `python3 spam.py`\n" \
           f"- Malware payloads: `msfvenom -p windows/meterpreter/reverse_tcp LHOST=...`\n" \
           f"- Exploit code: `python3 exploit.py --target 192.168.1.1`"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
