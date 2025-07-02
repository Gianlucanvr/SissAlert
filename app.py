from flask import Flask, request, jsonify, render_template
from datetime import datetime, timedelta
from collections import defaultdict
import threading

app = Flask(__name__)

segnalazioni = []
lock = threading.Lock()
VALIDITY_MINUTES = 30

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/segnala', methods=['POST'])
def segnala():
    ip = request.remote_addr
    now = datetime.utcnow()
    with lock:
        for seg in segnalazioni:
            if seg['ip'] == ip and now - seg['timestamp'] < timedelta(minutes=VALIDITY_MINUTES):
                remaining = timedelta(minutes=VALIDITY_MINUTES) - (now - seg['timestamp'])
                minuti = int(remaining.total_seconds() // 60) + 1
                return jsonify({
                    'success': False,
                    'message': f"Puoi segnalare di nuovo tra {minuti} minuti."
                }), 429

        segnalazioni.append({'ip': ip, 'timestamp': now})
    return jsonify({'success': True, 'message': 'Segnalazione ricevuta, grazie!'})

@app.route('/api/dati')
def dati():
    now = datetime.utcnow()
    counts = defaultdict(int)
    with lock:
        for seg in segnalazioni:
            if now - seg['timestamp'] < timedelta(hours=24):
                ora = seg['timestamp'].replace(minute=0, second=0, microsecond=0)
                counts[ora] += 1

    labels, data = [], []
    for i in range(24):
        ora = now - timedelta(hours=23 - i)
        ora_key = ora.replace(minute=0, second=0, microsecond=0)
        labels.append(ora_key.strftime('%H:%M'))
        data.append(counts.get(ora_key, 0))
    return jsonify({'labels': labels, 'data': data})

if __name__ == '__main__':
    app.run(debug=True)
