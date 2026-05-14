import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAclPPHIKBdfhZsryNxjSoKS61h2SlOwY4",
    authDomain: "hjc-s-website.firebaseapp.com",
    projectId: "hjc-s-website",
    storageBucket: "hjc-s-website.firebasestorage.app",
    messagingSenderId: "1039075400341",
    appId: "1:1039075400341:web:2386e52998e8bd9038199c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messagesCol = collection(db, "guestbook");

const form = document.querySelector("[data-guestbook-form]");
const messagesList = document.querySelector("[data-messages]");
const messagesPanel = document.querySelector(".messages-panel");
const nameInput = document.querySelector("#guestName");
const messageInput = document.querySelector("#guestMsg");
const submitButton = document.querySelector("[data-submit-message]");
const formStatus = document.querySelector("[data-form-status]");
const modal = document.querySelector("[data-guestbook-modal]");
const openGuestbookButtons = document.querySelectorAll("[data-open-guestbook]");
const closeGuestbookButton = document.querySelector("[data-close-guestbook]");
const toolCards = document.querySelectorAll("[data-tool-modal]");
const toolInfoModal = document.querySelector("[data-tool-info-modal]");
const closeToolModalButton = document.querySelector("[data-close-tool-modal]");
const toolTitle = document.querySelector("[data-tool-title]");
const toolMeta = document.querySelector("[data-tool-meta]");
const toolFeatures = document.querySelector("[data-tool-features]");
const toolNotice = document.querySelector("[data-tool-notice]");
const toolDownload = document.querySelector("[data-tool-download]");
const unlockTrack = document.querySelector("[data-unlock-track]");
const unlockHandle = document.querySelector("[data-unlock-handle]");
const unlockTitle = unlockTrack?.querySelector("#hero-title");

const messagesQuery = query(messagesCol, orderBy("createdAt", "desc"), limit(50));
const toolModalContent = {
    yuketang: {
        title: "雨课堂组件（HJC 改进）",
        meta: ["原作者：niuwh.cn", "改进者：HJC by Codex"],
        features: [
            "能够自动刷视频、发讨论、做作业。",
            "作业采用 OCR 后接入大模型。",
            "提供 DeepSeek API。",
            "改进后能够选择任一任务开始刷。"
        ],
        notice: "",
        downloadUrl: "https://github.com/sheephjc/sheephjc.github.io/releases/download/zip/Yuketang.zip"
    },
    recorder: {
        title: "隐藏式录屏",
        meta: [],
        features: [
            "打开后隐藏于任务栏托盘。",
            "可以在任务栏托盘启动关闭，也可以用快捷键控制。",
            "录屏过程全程隐藏。"
        ],
        notice: "请仅在本人设备或已获授权的场景使用。",
        downloadUrl: "https://github.com/sheephjc/sheephjc.github.io/releases/download/zip/HiddenScreenRecorder.zip"
    }
};
const unlockThreshold = 0.85;
const unlockResetDelay = 650;
let unlockPointerId = null;
let unlockStartX = 0;
let unlockCurrentX = 0;
let unlockMaxX = 0;
let unlockResetTimer = 0;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function getUnlockMaxX() {
    if (!unlockTrack || !unlockHandle) {
        return 0;
    }

    const trackStyle = getComputedStyle(unlockTrack);
    const paddingLeft = parseFloat(trackStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(trackStyle.paddingRight) || 0;

    return Math.max(0, unlockTrack.clientWidth - unlockHandle.offsetWidth - paddingLeft - paddingRight);
}

function setUnlockTitleEffect(progress, isActive) {
    if (!unlockTitle) {
        return;
    }

    if (!isActive && progress === 0) {
        unlockTitle.style.filter = "";
        unlockTitle.style.opacity = "";
        return;
    }

    const blur = (isActive ? 0.7 : 0) + progress * 5;
    const opacity = Math.max(0.62, 1 - progress * 0.38);
    unlockTitle.style.filter = `blur(${blur.toFixed(2)}px)`;
    unlockTitle.style.opacity = opacity.toFixed(3);
}

function setUnlockPosition(distance, isActive = false) {
    unlockCurrentX = clamp(distance, 0, unlockMaxX);
    const progress = unlockMaxX > 0 ? unlockCurrentX / unlockMaxX : 0;

    unlockTrack?.style.setProperty("--unlock-progress", progress.toFixed(3));
    unlockHandle?.style.setProperty("--unlock-x", `${unlockCurrentX.toFixed(1)}px`);
    setUnlockTitleEffect(progress, isActive);

    return progress;
}

function scrollToUnlockTarget() {
    const targetSelector = unlockTrack?.dataset.unlockTarget || "#projects";
    const target = document.querySelector(targetSelector);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetUnlock() {
    window.clearTimeout(unlockResetTimer);
    unlockPointerId = null;
    unlockCurrentX = 0;
    unlockTrack?.classList.remove("is-dragging", "is-unlocked");
    unlockTrack?.style.setProperty("--unlock-progress", "0");
    unlockHandle?.style.setProperty("--unlock-x", "0px");
    setUnlockTitleEffect(0, false);
}

function completeUnlock() {
    window.clearTimeout(unlockResetTimer);
    unlockTrack?.classList.remove("is-dragging");
    unlockTrack?.classList.add("is-unlocked");
    unlockMaxX = getUnlockMaxX();
    setUnlockPosition(unlockMaxX, true);
    scrollToUnlockTarget();
    unlockResetTimer = window.setTimeout(resetUnlock, unlockResetDelay);
}

function beginUnlockDrag(event) {
    if (event.pointerType === "mouse" && event.button !== 0) {
        return;
    }

    window.clearTimeout(unlockResetTimer);
    unlockMaxX = getUnlockMaxX();
    unlockStartX = event.clientX - unlockCurrentX;
    unlockPointerId = event.pointerId;
    unlockTrack?.classList.remove("is-unlocked");
    unlockTrack?.classList.add("is-dragging");
    unlockHandle?.setPointerCapture(event.pointerId);
    setUnlockPosition(unlockCurrentX, true);
    event.preventDefault();
}

function moveUnlockDrag(event) {
    if (unlockPointerId !== event.pointerId) {
        return;
    }

    setUnlockPosition(event.clientX - unlockStartX, true);
    event.preventDefault();
}

function endUnlockDrag(event) {
    if (unlockPointerId !== event.pointerId) {
        return;
    }

    if (unlockHandle?.hasPointerCapture(event.pointerId)) {
        unlockHandle.releasePointerCapture(event.pointerId);
    }
    unlockPointerId = null;

    const progress = setUnlockPosition(unlockCurrentX, true);
    if (progress >= unlockThreshold) {
        completeUnlock();
        return;
    }

    resetUnlock();
}

function cancelUnlockDrag(event) {
    if (unlockPointerId !== event.pointerId) {
        return;
    }

    if (unlockHandle?.hasPointerCapture(event.pointerId)) {
        unlockHandle.releasePointerCapture(event.pointerId);
    }
    resetUnlock();
}

function unlockWithKeyboard(event) {
    if (event.key !== "Enter" && event.key !== " ") {
        return;
    }

    event.preventDefault();
    window.clearTimeout(unlockResetTimer);
    unlockMaxX = getUnlockMaxX();
    unlockTrack?.classList.remove("is-dragging");
    unlockTrack?.classList.add("is-unlocked");
    setUnlockPosition(unlockMaxX, true);
    scrollToUnlockTarget();
    unlockResetTimer = window.setTimeout(resetUnlock, unlockResetDelay);
}

if (unlockTrack && unlockHandle) {
    unlockHandle.addEventListener("pointerdown", beginUnlockDrag);
    unlockHandle.addEventListener("pointermove", moveUnlockDrag);
    unlockHandle.addEventListener("pointerup", endUnlockDrag);
    unlockHandle.addEventListener("pointercancel", cancelUnlockDrag);
    unlockHandle.addEventListener("keydown", unlockWithKeyboard);
}

function openGuestbook() {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => nameInput.focus(), 0);
}

function closeGuestbook() {
    modal.hidden = true;
    document.body.style.overflow = "";
}

openGuestbookButtons.forEach((button) => {
    button.addEventListener("click", openGuestbook);
});

closeGuestbookButton.addEventListener("click", closeGuestbook);

modal.addEventListener("click", (event) => {
    if (event.target === modal) {
        closeGuestbook();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
        return;
    }

    if (toolInfoModal && !toolInfoModal.hidden) {
        closeToolModal();
        return;
    }

    if (!modal.hidden) {
        closeGuestbook();
    }
});

function renderToolTextList(container, items, className) {
    container.replaceChildren();

    items.forEach((item) => {
        const element = document.createElement(className === "tool-meta-item" ? "span" : "li");
        element.className = className;
        element.textContent = item;
        container.append(element);
    });
}

function openToolModal(card, event) {
    const content = toolModalContent[card.dataset.toolModal];
    if (!content || !toolInfoModal) {
        return;
    }

    event.preventDefault();
    toolTitle.textContent = content.title;
    renderToolTextList(toolMeta, content.meta, "tool-meta-item");
    renderToolTextList(toolFeatures, content.features, "");
    toolNotice.textContent = content.notice;
    toolNotice.hidden = !content.notice;
    toolDownload.href = content.downloadUrl;
    toolInfoModal.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => closeToolModalButton.focus(), 0);
}

function closeToolModal() {
    toolInfoModal.hidden = true;
    document.body.style.overflow = "";
}

toolCards.forEach((card) => {
    card.addEventListener("click", (event) => openToolModal(card, event));
});

closeToolModalButton?.addEventListener("click", closeToolModal);

toolInfoModal?.addEventListener("click", (event) => {
    if (event.target === toolInfoModal) {
        closeToolModal();
    }
});

function setStatus(message, isError = false) {
    formStatus.textContent = message;
    formStatus.classList.toggle("is-error", isError);
}

function renderEmptyMessage(message) {
    messagesList.replaceChildren();
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = message;
    messagesList.append(empty);
}

function formatDate(timestamp) {
    if (!timestamp?.toDate) {
        return "刚刚";
    }

    return timestamp.toDate().toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function renderMessage(data) {
    const item = document.createElement("article");
    item.className = "message-item";

    const header = document.createElement("header");
    const name = document.createElement("strong");
    const time = document.createElement("time");
    const text = document.createElement("p");

    name.textContent = data.name || "路人甲";
    time.textContent = formatDate(data.createdAt);
    text.textContent = data.text || "";

    header.append(name, time);
    item.append(header, text);
    return item;
}

onSnapshot(
    messagesQuery,
    (snapshot) => {
        messagesPanel.setAttribute("aria-busy", "false");

        if (snapshot.empty) {
            renderEmptyMessage("暂无留言，快来抢沙发！");
            return;
        }

        const fragment = document.createDocumentFragment();
        snapshot.forEach((doc) => {
            fragment.append(renderMessage(doc.data()));
        });
        messagesList.replaceChildren(fragment);
    },
    (error) => {
        console.error("留言加载失败:", error);
        messagesPanel.setAttribute("aria-busy", "false");
        renderEmptyMessage("留言暂时加载失败，请稍后刷新。");
    }
);

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const text = messageInput.value.trim();
    if (!text) {
        setStatus("先写一点内容再发送。", true);
        messageInput.focus();
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "发送中...";
    setStatus("正在发送...");

    try {
        await addDoc(messagesCol, {
            name: nameInput.value.trim() || "路人甲",
            text,
            createdAt: serverTimestamp()
        });
        messageInput.value = "";
        setStatus("发送成功。");
    } catch (error) {
        console.error("写入失败:", error);
        setStatus("发送失败，请稍后再试。", true);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "发送";
    }
});
