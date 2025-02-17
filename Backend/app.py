from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import pandas as pd
import io
import os, json
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024

ALLOWED_EXTENSIONS = {"csv"}

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        return str(obj)

app.json_encoder = CustomJSONEncoder

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def process_csv(file_stream):
    # Ensure RunDb directory exists with error handling
    db_dir = 'RunDb'
    try:
        if not os.path.exists(db_dir):
            os.makedirs(db_dir)
    except Exception as e:
        print(f"Error creating RunDb directory: {e}")
        return False

    db_path = os.path.join(db_dir, 'Run.db')
    
    try:
        conn = sqlite3.connect(db_path)
        dfM = pd.read_sql("SELECT * FROM Run", conn)
        r = dfM['Run Number'].max() if not dfM.empty else 0
    except Exception as e:
        print(f"Database error: {e}")
        r = 0
        dfM = pd.DataFrame(columns=["Run Number", "Rack:Tube", "Solution Label", "Timestamp"])

    try:
        df = pd.read_csv(file_stream)
        df.insert(0, 'Run Number', 1)
        row_number = df[df['Solution Label'] == 'QC_MES_5 ppm'].index
        if not row_number.empty:
            df = df.loc[row_number[0]:]
        df.reset_index(drop=True, inplace=True)
        
        for i in range(len(df)):
            if df.loc[i, 'Solution Label'] == 'QC_MES_5 ppm':
                r += 1
            df.loc[i, 'Run Number'] = r

        dfM = pd.concat([dfM, df], ignore_index=True)
        dfM.to_sql('Run', conn, if_exists='replace', index=False)
        conn.commit()
    except Exception as e:
        print(f"CSV processing error: {e}")
        return False
    finally:
        conn.close()
    
    return True

@app.route("/")
@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"message": "No file uploaded"}), 400

    file = request.files["file"]
    
    if file.filename == "":
        return jsonify({"message": "No selected file"}), 400
        
    if file and allowed_file(file.filename):
        try:
            file_stream = io.BytesIO(file.read())
            file_stream.seek(0)
            
            df = pd.read_csv(file_stream)
            
            df = df.astype(str)  # Convert all columns to string type during reading
            
            preview_data = df.head(10).to_dict(orient="records")
            
            # Save file
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            file_stream.seek(0)
            with open(file_path, 'wb') as f:
                f.write(file_stream.getvalue())

            # run db file processing
            process_csv(file_stream)
                
            return jsonify({
                "message": "File uploaded successfully",
                "preview": preview_data
            }), 200
        
        except Exception as e:
            return jsonify({"message": f"Error processing file: {str(e)}"}), 500

    return jsonify({"message": "Invalid file format"}), 400

if __name__ == "__main__":
    app.run(debug=True, port=5000)