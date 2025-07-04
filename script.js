// (Ringkasan awal)
// - Format: Rupiah
// - Budget tiap bulan + carry over
// - Konfirmasi add
// - PDF Export
// - Pie Chart (Chart.js)

let expenses = JSON.parse(localStorage.getItem("expenses")) || [];
let categoryChart;

function formatRupiah(num) {
  return num.toLocaleString("id-ID");
}

function getMonth(date) {
  return date.substring(0, 7);
}

function updateTodayTitle() {
  const today = new Date();
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  document.getElementById("today-title").innerText = today.toLocaleDateString("en-US", options);
}

function updateMonthSelector() {
  const months = [...new Set(expenses.map(e => getMonth(e.date)))];
  const selector = document.getElementById("month-filter");
  selector.innerHTML = "";
  months.forEach(m => {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = m;
    selector.appendChild(option);
  });
  if (months.length) selector.value = months[months.length - 1];
}

function getCarryOver(currentMonth) {
  const months = [...new Set(expenses.map(e => getMonth(e.date)))].sort();
  const idx = months.indexOf(currentMonth);
  if (idx <= 0) return 0;

  const prevMonth = months[idx - 1];
  const prevBudget = parseFloat(localStorage.getItem(`budget-${prevMonth}`)) || 0;
  const prevExpenses = expenses
    .filter(e => getMonth(e.date) === prevMonth)
    .reduce((acc, cur) => acc + cur.amount, 0);

  const diff = prevBudget - prevExpenses;
  localStorage.setItem(`carry-${currentMonth}`, diff);
  return diff;
}

function updateCarryNote(currentMonth) {
  const note = document.getElementById("carryover-note");
  const carry = parseFloat(localStorage.getItem(`carry-${currentMonth}`)) || 0;

  if (carry > 0) {
    note.className = "positive";
    note.innerText = `💡 Surplus from last month: +Rp ${formatRupiah(carry)}`;
  } else if (carry < 0) {
    note.className = "negative";
    note.innerText = `⚠️ Deficit from last month: -Rp ${formatRupiah(Math.abs(carry))}`;
  } else {
    note.className = "";
    note.innerText = "";
  }
}

function updateNetTotal() {
  let totalNet = 0;
  const months = [...new Set(expenses.map(e => getMonth(e.date)))];

  months.forEach(month => {
    const budget = parseFloat(localStorage.getItem(`budget-${month}`)) || 0;
    const carry = parseFloat(localStorage.getItem(`carry-${month}`)) || 0;
    const spent = expenses.filter(e => getMonth(e.date) === month)
                          .reduce((acc, cur) => acc + cur.amount, 0);
    totalNet += budget + carry - spent;
  });

  document.getElementById("total-net").innerText = formatRupiah(totalNet);
}

function updateChart(monthExpenses) {
  const data = {};
  monthExpenses.forEach(e => {
    data[e.category] = (data[e.category] || 0) + e.amount;
  });

  const ctx = document.getElementById("categoryChart").getContext("2d");
  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(data),
      datasets: [{
        data: Object.values(data),
        backgroundColor: ['#90e0ef','#f9c74f','#f8961e','#ef476f','#06d6a0']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function updateUI() {
  const month = document.getElementById("month-filter").value;
  const baseBudget = parseFloat(document.getElementById("budget").value) || 0;
  localStorage.setItem(`budget-${month}`, baseBudget);

  const carry = getCarryOver(month);
  const totalBudget = baseBudget + carry;
  updateCarryNote(month);
  updateNetTotal();

  const filtered = expenses.filter(e => getMonth(e.date) === month);
  const list = document.getElementById("expense-list");
  list.innerHTML = "";
  let total = 0;

  filtered.forEach((exp, index) => {
    total += exp.amount;
    const li = document.createElement("li");
    const level = exp.amount <= 50000 ? "low" : exp.amount <= 100000 ? "medium" : "high";
    li.innerHTML = `
      <span>${exp.date} - ${exp.description} (${exp.category}): Rp ${formatRupiah(exp.amount)}</span>
      <span>
        <span class="icon ${level}"></span>
        <button class="delete-btn" onclick="deleteExpense(${index})">🗑</button>
      </span>
    `;
    list.appendChild(li);
  });

  const remaining = totalBudget - total;
  const remainingEl = document.getElementById("remaining");
  remainingEl.innerText = formatRupiah(remaining);
  remainingEl.className = remaining < 0 ? "negative" : "";

  updateChart(filtered);
}

function confirmAdd() {
  const desc = document.getElementById("description").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const date = document.getElementById("date").value;
  if (!desc || isNaN(amount) || !date) return alert("Please fill all fields.");

  document.getElementById("confirm-modal").style.display = "block";
}

function closeModal() {
  document.getElementById("confirm-modal").style.display = "none";
}

function addExpense() {
  const desc = document.getElementById("description").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const date = document.getElementById("date").value;
  const category = document.getElementById("category").value;

  expenses.push({ description: desc, amount, date, category });
  localStorage.setItem("expenses", JSON.stringify(expenses));
  closeModal();
  updateMonthSelector();
  updateUI();
  document.getElementById("description").value = "";
  document.getElementById("amount").value = "";
  document.getElementById("date").value = "";
}

function deleteExpense(index) {
  const month = document.getElementById("month-filter").value;
  const filtered = expenses.filter(e => getMonth(e.date) === month);
  const globalIndex = expenses.findIndex((e, i) => e === filtered[index]);
  if (globalIndex > -1) {
    expenses.splice(globalIndex, 1);
    localStorage.setItem("expenses", JSON.stringify(expenses));
    updateMonthSelector();
    updateUI();
  }
}

function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const month = document.getElementById("month-filter").value;
  const filtered = expenses.filter(e => getMonth(e.date) === month);
  doc.setFontSize(14);
  doc.text(`Expense Report - ${month}`, 10, 10);
  let y = 20;
  filtered.forEach((e, i) => {
    doc.text(`${i + 1}. ${e.date} - ${e.description} (${e.category}): Rp ${formatRupiah(e.amount)}`, 10, y);
    y += 8;
  });
  doc.save(`expenses_${month}.pdf`);
}

function showCarryHistory() {
  const list = document.getElementById("carry-list");
  list.innerHTML = "";

  Object.keys(localStorage)
    .filter(k => k.startsWith("carry-"))
    .sort()
    .forEach(key => {
      const month = key.replace("carry-", "");
      const value = parseFloat(localStorage.getItem(key));
      const status = value >= 0 ? "✅ Surplus" : "⚠️ Deficit";
      const li = document.createElement("li");
      li.innerText = `${month}: ${status} Rp ${formatRupiah(Math.abs(value))}`;
      list.appendChild(li);
    });

  document.getElementById("history-modal").style.display = "block";
}

function closeHistory() {
  document.getElementById("history-modal").style.display = "none";
}

// Initial load
updateTodayTitle();
updateMonthSelector();
updateUI();
