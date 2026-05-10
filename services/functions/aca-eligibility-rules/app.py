from flask import Flask, request, jsonify
app = Flask(__name__)

@app.post('/evaluate')
def evaluate():
    data = request.get_json(silent=True) or {}
    try:
        income = float(data.get('incomeAnnual', 0))
        residency_months = int(data.get('residencyMonths', 0))
    except (TypeError, ValueError):
        return jsonify({'error': 'invalid-input', 'fields': ['incomeAnnual', 'residencyMonths']}), 400
    eligible = income < 420000 and residency_months >= 6
    return jsonify({'eligible': eligible, 'ruleVersion': '2026.05', 'reasons': ['income-threshold', 'residency-duration'], 'traceparent': request.headers.get('traceparent')})

@app.get('/health')
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
