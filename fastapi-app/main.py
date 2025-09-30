from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List, Optional
import json
import os

app = FastAPI()

# To-Do 항목 모델
class TodoItem(BaseModel):
    id: int
    title: str
    description: str
    completed: bool

class UpdateTodoItem(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None

class ReorderRequest(BaseModel):
    ids: List[int]

# JSON 파일 경로
TODO_FILE = "todo.json"

# JSON 파일에서 To-Do 항목 로드
def load_todos():
    if not os.path.exists(TODO_FILE): return []
    with open(TODO_FILE, "r", encoding="utf-8") as file:
        try:
            return json.load(file)
        except json.JSONDecodeError:
            return []

# JSON 파일에 To-Do 항목 저장
def save_todos(todos):
    with open(TODO_FILE, "w", encoding="utf-8") as file:
        json.dump(todos, file, indent=4, ensure_ascii=False)

# To-Do 목록 조회
@app.get("/todos", response_model=list[TodoItem])
def get_todos():
    return load_todos()

# 신규 To-Do 항목 추가
@app.post("/todos", response_model=TodoItem)
def create_todo(todo: TodoItem):
    todos = load_todos()
    todos.append(todo.dict())
    save_todos(todos)
    return todo

# To-Do 항목 수정
@app.put("/todos/{todo_id}", response_model=TodoItem)
def update_todo(todo_id: int, updated_data: UpdateTodoItem):
    todos = load_todos()
    todo_to_update = next((t for t in todos if t["id"] == todo_id), None)

    if not todo_to_update:
        raise HTTPException(status_code=404, detail="To-Do item not found")

    update_data = updated_data.model_dump(exclude_unset=True)
    todo_to_update.update(update_data)
    save_todos(todos)
    return todo_to_update

# To-Do 항목 삭제
@app.delete("/todos/{todo_id}", response_model=dict)
def delete_todo(todo_id: int):
    todos = load_todos()
    original_length = len(todos)
    todos_after_deletion = [todo for todo in todos if todo["id"] != todo_id]

    if len(todos_after_deletion) == original_length:
        raise HTTPException(status_code=404, detail="To-Do item not found")

    save_todos(todos_after_deletion)
    return {"message": "To-Do item deleted"}

@app.post("/todos/reorder")
def reorder_todos(request: ReorderRequest):
    todos = load_todos()
    # 순서 변경된 ID 리스트를 기반으로 기존 목록을 재정렬
    id_to_todo_map = {todo["id"]: todo for todo in todos}
    reordered_todos = [id_to_todo_map[id] for id in request.ids if id in id_to_todo_map]

    # 만약 목록에 없는 ID가 전달된 경우, 기존 목록에 있는 것들만으로 순서를 만듦
    if len(reordered_todos) != len(todos):
         raise HTTPException(status_code=400, detail="ID list does not match existing todos")

    save_todos(reordered_todos)
    return {"message": "Todos reordered successfully"}

# HTML 파일 서빙
@app.get("/", response_class=HTMLResponse)
def read_root():
    html_file_path = "templates/index.html" # 간소화
    if not os.path.exists(html_file_path):
        raise HTTPException(status_code=404, detail="index.html not found")
    with open(html_file_path, "r", encoding="utf-8") as file:
        return HTMLResponse(content=file.read())