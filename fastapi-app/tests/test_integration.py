# fastapi-app/tests/test_integration.py

import requests

# 실제 배포된 서버의 주소를 입력합니다.
DEPLOYED_URL = "http://13.125.167.23:8002"

def test_health_check():
    """배포된 서버가 정상적으로 응답하는지 확인 (헬스 체크)"""
    try:
        response = requests.get(DEPLOYED_URL)
        # HTTP 응답 코드가 200 (OK) 인지 확인
        assert response.status_code == 200
        # 응답 내용에 'FastAPI'라는 글자가 포함되어 있는지 확인
        assert "FastAPI" in response.text
    except requests.exceptions.ConnectionError as e:
        # 서버에 아예 접속이 안될 경우 테스트를 실패 처리
        assert False, f"서버에 연결할 수 없습니다: {DEPLOYED_URL} ({e})"
