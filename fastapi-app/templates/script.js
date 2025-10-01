const todoListContainer = document.getElementById("todo-list"); // To-Do 리스트 컨테이너
let currentTodoForMenu = null; // 어떤 아이템이 우클릭되었는지 저장하는 변수

async function fetchTodos() {
  const response = await fetch("/todos");
  const todos = await response.json();

  todos.sort((a, b) => a.completed - b.completed);

  const todoList = document.getElementById("todo-list");
  todoList.innerHTML = "";
  todos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.id = `todo-${todo.id}`;

    // 우클릭 이벤트 리스너 추가
    li.addEventListener("contextmenu", (event) => {
      showContextMenu(event, todo);
    });

    const checkbox = document.createElement("input");
    checkbox.className = "todo-checkbox";
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;

    checkbox.addEventListener("click", async () => {
      await fetch(`/todos/${todo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !todo.completed }),
      });
      fetchTodos();
    });

    const contentDiv = document.createElement("div");
    contentDiv.className = "todo-content";
    contentDiv.textContent = `${todo.title}: ${todo.description}`;

    if (todo.completed) {
      contentDiv.style.textDecoration = "line-through";
      contentDiv.style.color = "#aaa";
    }

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "todo-actions";

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.onclick = () => editTodo(todo);

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.onclick = () => deleteTodo(todo);

    actionsDiv.appendChild(editButton);
    actionsDiv.appendChild(deleteButton);

    li.appendChild(checkbox);
    li.appendChild(contentDiv);
    li.appendChild(actionsDiv);

    todoList.appendChild(li);
  });
}

async function editTodo(todo) {
  const newTitle = prompt("새 제목:", todo.title);
  if (newTitle === null) return;
  const newDescription = prompt("새 설명:", todo.description);
  if (newDescription === null) return;

  await fetch(`/todos/${todo.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: newTitle,
      description: newDescription,
    }),
  });
  fetchTodos();
}

async function deleteTodo(todo) {
  var confirmflag = confirm("Are you sure to delete this?");
  if (!confirmflag) {
    return;
  }
  const response = await fetch(`/todos/${todo.id}`, {
    method: "DELETE",
  });
  if (response.ok) {
    // fetchTodos();
    document.getElementById(`todo-${todo.id}`).remove();
  }
}

// 폼 제출 이벤트 핸들러
document
  .getElementById("todo-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const response = await fetch("/todos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: Date.now(),
        title,
        description,
        completed: false,
      }),
    });
    if (response.ok) {
      fetchTodos();
      document.getElementById("title").value = "";
      document.getElementById("description").value = "";
    }
  });

// 드래그 구현
const todoListEl = document.getElementById("todo-list");
new Sortable(todoListEl, {
  animation: 200,
  ghostClass: "sortable-ghost",
  chosenClass: "sortable-chosen",

  // 드래그가 끝났을 때 호출되는 함수
  onEnd: async function () {
    // 자식 요소들의 현재 순서를 가져옴
    const updatedItems = [...todoListEl.children];
    const idsInNewOrder = updatedItems.map((item) =>
      parseInt(item.id.split("-")[1])
    );

    // 서버에 변경된 순서를 저장합니다.
    await fetch("/todos/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: idsInNewOrder }),
    });
  },
});

// ---------- 우클릭 시 컨텍스트 메뉴 ----------

// 1. 페이지 로드 시 커스텀 메뉴 요소를 미리 생성
function createContextMenu() {
  const menu = document.createElement("div");
  menu.id = "custom-context-menu";
  menu.className = "custom-context-menu";

  const addItem = document.createElement("div");
  addItem.className = "context-menu-item";
  addItem.textContent = "일정 추가";

  // 메뉴 아이템 클릭 시 실행될 동작
  addItem.onclick = () => {
    if (currentTodoForMenu) {
      // 실제 기능 대신 간단한 알림창으로 대체
      alert(`'${currentTodoForMenu.title}' 항목에 대한 일정을 추가합니다.`);
    }
    hideContextMenu(); // 메뉴 숨기기
  };

  menu.appendChild(addItem);
  document.body.appendChild(menu);
}

// 2. 메뉴를 보여주는 함수
function showContextMenu(event, todo) {
  event.preventDefault(); // 브라우저 기본 우클릭 메뉴 방지
  currentTodoForMenu = todo; // 클릭된 todo 정보 저장

  const menu = document.getElementById("custom-context-menu");
  menu.style.display = "block";
  // 마우스 클릭 위치에 메뉴를 표시
  menu.style.left = `${event.pageX}px`;
  menu.style.top = `${event.pageY}px`;
}

// 3. 메뉴를 숨기는 함수
function hideContextMenu() {
  const menu = document.getElementById("custom-context-menu");
  if (menu) {
    menu.style.display = "none";
  }
  currentTodoForMenu = null;
}

// 4. 화면의 다른 곳을 클릭하거나 Esc 키를 누르면 메뉴가 닫히도록 설정
window.addEventListener("click", hideContextMenu);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    hideContextMenu();
  }
});

// -------------------------------------

createContextMenu();
fetchTodos();
