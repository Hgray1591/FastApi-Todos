import pytest
from fastapi.testclient import TestClient
import os
import json

# 현재 파일의 상위 폴더를 sys.path에 추가하여 'main' 모듈을 찾을 수 있도록 함
# (프로젝트 구조가 /main.py, /tests/test.py 일 경우)
# import sys
# sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# main.py에서 필요한 것들을 가져옵니다. 파일 이름이 main.py가 아니라면 수정해주세요.
from main import app, TodoItem 

client = TestClient(app)

# 테스트용 JSON 파일 경로
TEST_TODO_FILE = "test_todos.json"

# --- 테스트 설정 (Fixture) ---

@pytest.fixture(autouse=True)
def setup_and_teardown(monkeypatch):
    """ 각 테스트 실행 전후로 실행되는 Fixture """
    
    # main.py의 TODO_FILE 변수를 테스트용 파일 경로로 임시 변경 (테스트 격리)
    monkeypatch.setattr("main.TODO_FILE", TEST_TODO_FILE)
    
    # 테스트 시작 전: 테스트 파일을 깨끗한 상태로 초기화
    with open(TEST_TODO_FILE, "w") as f:
        json.dump([], f)
    
    yield  # 여기에서 실제 테스트 함수가 실행됩니다.
    
    # 테스트 종료 후: 생성된 테스트 파일 삭제
    if os.path.exists(TEST_TODO_FILE):
        os.remove(TEST_TODO_FILE)

# --- 테스트 케이스 ---

def test_get_todos_empty():
    """ 초기 To-Do 목록이 비어있는지 확인 """
    response = client.get("/todos")
    assert response.status_code == 200
    assert response.json() == []

def test_create_and_get_todo():
    """ To-Do 항목을 생성하고 다시 조회했을 때 잘 들어있는지 확인 """
    # 1. 항목 생성
    todo_data = {"id": 1, "title": "Test 1", "description": "Desc 1", "completed": False}
    response = client.post("/todos", json=todo_data)
    assert response.status_code == 200
    assert response.json()["title"] == "Test 1"

    # 2. 목록 조회
    response = client.get("/todos")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["title"] == "Test 1"

def test_create_todo_invalid_data():
    """ 필수 필드가 누락된 To-Do 항목 생성 시 422 에러가 발생하는지 확인 """
    invalid_todo = {"id": 1, "title": "Incomplete"}  # description, completed 누락
    response = client.post("/todos", json=invalid_todo)
    assert response.status_code == 422  # Unprocessable Entity

def test_update_todo_partial():
    """ [추가됨] To-Do 항목의 일부(completed)만 수정하는 기능 테스트 """
    # 1. 초기 데이터 저장
    initial_todo = TodoItem(id=1, title="Test", description="Desc", completed=False)
    with open(TEST_TODO_FILE, "w") as f:
        json.dump([initial_todo.model_dump()], f)

    # 2. 'completed' 상태만 업데이트 요청
    update_data = {"completed": True}
    response = client.put("/todos/1", json=update_data)
    assert response.status_code == 200
    assert response.json()["completed"] is True
    assert response.json()["title"] == "Test" # 다른 필드는 그대로인지 확인

def test_update_todo_not_found():
    """ 존재하지 않는 To-Do 항목 수정 시 404 에러가 발생하는지 확인 """
    update_data = {"title": "Updated"}
    response = client.put("/todos/999", json=update_data)
    assert response.status_code == 404

def test_delete_todo():
    """ To-Do 항목 삭제 기능 테스트 """
    # 1. 초기 데이터 저장
    initial_todo = TodoItem(id=1, title="To Delete", description="Desc", completed=False)
    with open(TEST_TODO_FILE, "w") as f:
        json.dump([initial_todo.model_dump()], f)
        
    # 2. 삭제 요청
    response = client.delete("/todos/1")
    assert response.status_code == 200
    # [수정됨] API 응답 메시지에 맞춰 수정
    assert response.json()["message"] == "To-Do item deleted"

    # 3. 삭제 후 목록이 비었는지 확인
    response = client.get("/todos")
    assert response.status_code == 200
    assert response.json() == []

def test_delete_todo_not_found():
    """ [수정됨] 존재하지 않는 To-Do 항목 삭제 시 404 에러가 발생하는지 확인 """
    response = client.delete("/todos/999")
    assert response.status_code == 404

def test_reorder_todos():
    """ [추가됨] To-Do 목록 순서 변경 기능 테스트 """
    # 1. 초기 데이터 3개 저장
    todos_data = [
        {"id": 1, "title": "First", "description": "", "completed": False},
        {"id": 2, "title": "Second", "description": "", "completed": False},
        {"id": 3, "title": "Third", "description": "", "completed": False}
    ]
    with open(TEST_TODO_FILE, "w") as f:
        json.dump(todos_data, f)
    
    # 2. 새로운 순서 [3, 1, 2] 로 변경 요청
    reorder_data = {"ids": [3, 1, 2]}
    response = client.post("/todos/reorder", json=reorder_data)
    assert response.status_code == 200

    # 3. 변경된 순서가 맞는지 확인
    response = client.get("/todos")
    assert response.status_code == 200
    retrieved_todos = response.json()
    assert len(retrieved_todos) == 3
    assert retrieved_todos[0]["id"] == 3
    assert retrieved_todos[1]["id"] == 1
    assert retrieved_todos[2]["id"] == 2

def test_reorder_todos_bad_request():
    """ [추가됨] ID 목록이 맞지 않을 때 400 에러가 발생하는지 확인 """
    # 1. 초기 데이터 2개 저장
    todos_data = [
        {"id": 1, "title": "First", "description": "", "completed": False},
        {"id": 2, "title": "Second", "description": "", "completed": False}
    ]
    with open(TEST_TODO_FILE, "w") as f:
        json.dump(todos_data, f)
    
    # 2. 일부 ID만 포함된 잘못된 순서로 변경 요청
    reorder_data = {"ids": [2]}
    response = client.post("/todos/reorder", json=reorder_data)
    assert response.status_code == 400