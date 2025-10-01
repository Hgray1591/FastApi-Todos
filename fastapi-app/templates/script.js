const todoListElement = document.getElementById("todo-list"); // To-Do 리스트 컨테이너
let currentTodoForMenu = null; // 어떤 아이템이 우클릭되었는지 저장하는 변수

async function fetchTodos() {
  const response = await fetch("/todos");
  const todos = await response.json();

  todos.sort((a, b) => a.completed - b.completed);

  const todoListElement = document.getElementById("todo-list");
  todoListElement.innerHTML = "";
  todos.forEach((todo) => {
    // 분리된 함수를 호출하여 li 요소를 생성하고 추가
    const li = createTodoElement(todo);
    todoListElement.appendChild(li);
  });
}

function createTodoElement(todo) {
  const li = document.createElement("li");
  li.className = "todo-item";
  li.id = `todo-${todo.id}`;
  li.addEventListener("contextmenu", (event) => showContextMenu(event, todo));

  // 1. 체크박스 생성
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

  // 2. 내용(제목/설명 + 일정) 부분 생성
  const contentWrapper = document.createElement("div");
  contentWrapper.style.flexGrow = "1";

  const contentDiv = document.createElement("div");
  contentDiv.className = "todo-content";
  contentDiv.innerHTML = `<b>${todo.title}:</b> ${todo.description}`;
  if (todo.completed) {
    contentDiv.style.textDecoration = "line-through";
    contentDiv.style.color = "#aaa";
  }
  contentWrapper.appendChild(contentDiv);

  if (todo.schedule) {
    const scheduleDiv = document.createElement("small");
    scheduleDiv.style.display = "block";
    scheduleDiv.style.color = "#555";
    scheduleDiv.style.marginTop = "4px";
    const scheduleDate = new Date(todo.schedule);
    scheduleDiv.textContent = `📅 ${scheduleDate.toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })}`;
    contentWrapper.appendChild(scheduleDiv);
  }

  // 3. 버튼(수정/삭제) 부분 생성
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
  li.appendChild(contentWrapper);
  li.appendChild(actionsDiv);

  return li;
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

    // 서버에 변경된 순서를 저장
    await fetch("/todos/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: idsInNewOrder }),
    });
  },
});

// ---------- 우클릭 시 컨텍스트 메뉴 ----------

function createScheduleModal() {
  const modalOverlay = document.createElement("div");
  modalOverlay.id = "schedule-modal";
  modalOverlay.className = "modal-overlay";

  modalOverlay.innerHTML = `
            <div class="modal-content">
                <h3>일정 설정</h3>
                <p id="modal-todo-title"></p>
                <input type="datetime-local" id="schedule-input">
                <div class="modal-actions">
                    <button id="btn-cancel-schedule">취소</button>
                    <button id="btn-save-schedule" class="btn-save">저장</button>
                </div>
            </div>
        `;
  document.body.appendChild(modalOverlay);

  // 모달 창 닫기 (취소 버튼 또는 배경 클릭)
  const closeModal = () => {
    modalOverlay.style.display = "none";
  };
  modalOverlay.querySelector("#btn-cancel-schedule").onclick = closeModal;
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      // 배경 클릭 시 닫기
      closeModal();
    }
  });

  // 저장 버튼 클릭 시 동작
  modalOverlay.querySelector("#btn-save-schedule").onclick = async () => {
    const todoId = modalOverlay.dataset.todoId;
    const newSchedule = modalOverlay.querySelector("#schedule-input").value;

    if (todoId && newSchedule) {
      await fetch(`/todos/${todoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule: newSchedule }),
      });
      fetchTodos(); // 화면 새로고침
      closeModal();
    }
  };
}

// 여기까지는 모달

// 1. 페이지 로드 시 커스텀 메뉴 요소를 미리 생성
function createContextMenu() {
  const menu = document.createElement("div");
  menu.id = "custom-context-menu";
  menu.className = "custom-context-menu";

  // ------ 일정 추가 ------
  const addItem = document.createElement("div");
  addItem.className = "context-menu-item";
  addItem.textContent = "일정 추가";

  // 메뉴 아이템 클릭 시 실행될 동작
  addItem.onclick = () => {
    if (!currentTodoForMenu) return;

    const modal = document.getElementById("schedule-modal");
    const modalTitle = document.getElementById("modal-todo-title");
    const scheduleInput = document.getElementById("schedule-input");

    // 모달에 현재 To-Do의 ID와 제목을 전달
    modal.dataset.todoId = currentTodoForMenu.id;
    modalTitle.textContent = `'${currentTodoForMenu.title}' 항목의 일정을 설정합니다.`;

    // input의 기본값 설정
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const defaultValue = currentTodoForMenu.schedule
      ? currentTodoForMenu.schedule.slice(0, 16)
      : now.toISOString().slice(0, 16);
    scheduleInput.value = defaultValue;

    modal.style.display = "flex"; // 모달 보이기
    hideContextMenu();
  };

  // ------ 일정 삭제 ------
  const deleteItem = document.createElement("div");
  deleteItem.id = "delete-schedule-item";
  deleteItem.className = "context-menu-item";
  deleteItem.textContent = "일정 삭제";
  deleteItem.style.color = "red";

  deleteItem.onclick = async () => {
    if (!currentTodoForMenu || !currentTodoForMenu.schedule) return;

    if (
      confirm(`'${currentTodoForMenu.title}' 항목의 일정을 삭제하시겠습니까?`)
    ) {
      await fetch(`/todos/${currentTodoForMenu.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // schedule을 null로 설정하여 서버에 전송
        body: JSON.stringify({ schedule: null }),
      });
      fetchTodos(); // 화면 새로고침
    }
    hideContextMenu(); // 메뉴 숨기기
  };

  menu.appendChild(addItem);
  menu.appendChild(deleteItem);
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
createScheduleModal();
fetchTodos();
