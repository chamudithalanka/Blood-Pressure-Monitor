// User Management
class UserManager {
    constructor() {
        this.checkFirstTimeUser();
        this.initializeEventListeners();
    }

    checkFirstTimeUser() {
        const userData = localStorage.getItem('userData');
        if (!userData) {
            document.getElementById('firstTimeLogin').style.display = 'block';
            document.getElementById('mainApp').style.display = 'none';
        } else {
            this.showMainApp(JSON.parse(userData));
        }
    }

    initializeEventListeners() {
        document.getElementById('userRegistrationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.registerUser();
        });
    }

    calculateAge(birthdate) {
        const today = new Date();
        const birthDate = new Date(birthdate);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    registerUser() {
        const name = document.getElementById('userName').value;
        const birthdate = document.getElementById('userBirthdate').value;
        const userData = { name, birthdate };
        localStorage.setItem('userData', JSON.stringify(userData));
        this.showMainApp(userData);
    }

    showMainApp(userData) {
        document.getElementById('firstTimeLogin').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('displayName').textContent = userData.name;
        document.getElementById('userAge').textContent = this.calculateAge(userData.birthdate);
    }
}

// Blood Pressure Data Management
class BPDataManager {
    constructor() {
        this.initializeForm();
        this.loadData();
        this.displayData();
        this.updateChart();
        this.editingId = null;
        this.currentMonth = new Date().getMonth();
        
        // Check for month change
        this.setupMonthlyCheck();

        // Add resize handler
        window.addEventListener('resize', () => {
            this.updateChart();
        });

        this.historyManager = null;
    }

    setHistoryManager(historyManager) {
        this.historyManager = historyManager;
    }

    initializeForm() {
        this.updateDateTime();
        // Set up an interval to update the date-time every minute
        setInterval(() => this.updateDateTime(), 60000);
        
        document.getElementById('bpForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveData();
        });
    }

    updateDateTime() {
        const now = new Date();
        // Format: YYYY-MM-DDTHH:mm
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
        document.getElementById('bpDate').value = formattedDateTime;
    }

    saveData() {
        try {
            const data = {
                date: document.getElementById('bpDate').value,
                systolic: parseInt(document.getElementById('systolic').value),
                diastolic: parseInt(document.getElementById('diastolic').value),
                pulse: parseInt(document.getElementById('pulse').value),
                comments: document.getElementById('comments').value
            };

            let bpData = this.loadData();

            if (this.editingId !== null) {
                bpData[this.editingId] = data;
                this.editingId = null;
                document.querySelector('#bpForm button[type="submit"]').textContent = 'Submit';
                this.showNotification('Record updated successfully!', 'success');
            } else {
                bpData.push(data);
                this.showNotification('New record added successfully!', 'success');
            }

            // Sort data by date before saving
            bpData.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Save sorted data
            localStorage.setItem('bpData', JSON.stringify(bpData));
            
            // Update displays
            this.displayData();
            this.updateChart();
            this.resetForm();

            // Force immediate history update
            if (this.historyManager) {
                setTimeout(() => {
                    this.historyManager.updateHistoryList();
                    // Update current month view if being viewed
                    const currentDate = new Date();
                    const currentMonthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
                    this.historyManager.refreshCurrentMonthView(currentMonthYear);
                }, 0);
            }
        } catch (error) {
            console.error('Save Error:', error);
            this.showNotification('Error saving data. Please try again.', 'error');
        }
    }

    displayData(specificData = null) {
        const data = specificData || this.loadData();
        const isCurrentMonth = !specificData || (
            new Date(data[0]?.date).getMonth() === new Date().getMonth() &&
            new Date(data[0]?.date).getFullYear() === new Date().getFullYear()
        );
        
        const tableHtml = `
            <table class="bp-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Systolic</th>
                        <th>Diastolic</th>
                        <th>Pulse</th>
                        <th>Comments</th>
                        ${isCurrentMonth ? '<th>Actions</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${data.map((item, index) => `
                        <tr>
                            <td>${new Date(item.date).toLocaleString()}</td>
                            <td>${item.systolic}</td>
                            <td>${item.diastolic}</td>
                            <td>${item.pulse}</td>
                            <td>${item.comments || ''}</td>
                            ${isCurrentMonth ? `
                                <td class="flex gap-2">
                                    <button class="edit-btn px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors" 
                                            onclick="bpDataManager.editEntry(${index})">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button class="delete-btn px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                            onclick="bpDataManager.deleteEntry(${index})">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </td>
                            ` : ''}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        const dataDisplay = document.getElementById('bpDataDisplay');
        if (dataDisplay) {
            dataDisplay.innerHTML = tableHtml;
            
            // Add event listeners after updating HTML
            if (isCurrentMonth) {
                const editButtons = dataDisplay.querySelectorAll('.edit-btn');
                const deleteButtons = dataDisplay.querySelectorAll('.delete-btn');
                
                editButtons.forEach((btn, index) => {
                    btn.onclick = () => this.editEntry(index);
                });
                
                deleteButtons.forEach((btn, index) => {
                    btn.onclick = () => this.deleteEntry(index);
                });
            }
        }
    }

    loadData() {
        return JSON.parse(localStorage.getItem('bpData') || '[]');
    }

    resetForm() {
        document.getElementById('bpForm').reset();
        this.updateDateTime(); // Update the date-time when form is reset
    }

    updateChart(specificData = null) {
        const data = specificData || this.loadData();
        
        // Sort data by date
        const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Get last 30 days of data
        const last30Days = sortedData.slice(-30);

        // Remove existing chart if it exists
        const existingChart = Chart.getChart('bpChart');
        if (existingChart) {
            existingChart.destroy();
        }

        const ctx = document.getElementById('bpChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: last30Days.map(item => {
                    const date = new Date(item.date);
                    return window.innerWidth < 640 ? 
                        `${date.getMonth()+1}/${date.getDate()}` : 
                        date.toLocaleDateString();
                }),
                datasets: [
                    {
                        label: 'Pulse (bpm)',
                        data: last30Days.map(item => item.pulse),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.1,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Pulse Rate Over Time',
                        font: {
                            size: window.innerWidth < 640 ? 14 : 16
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Beats Per Minute (BPM)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        });
    }

    editEntry(index) {
        const data = this.loadData();
        const entry = data[index];
        this.editingId = index;

        document.getElementById('bpDate').value = entry.date;
        document.getElementById('systolic').value = entry.systolic;
        document.getElementById('diastolic').value = entry.diastolic;
        document.getElementById('pulse').value = entry.pulse;
        document.getElementById('comments').value = entry.comments || '';

        // Change submit button text
        const submitBtn = document.querySelector('#bpForm button[type="submit"]');
        submitBtn.textContent = 'Update';
    }

    deleteEntry(index) {
        if (confirm('Are you sure you want to delete this entry?')) {
            let data = this.loadData();
            data.splice(index, 1);
            localStorage.setItem('bpData', JSON.stringify(data));
            this.displayData();
            this.updateChart();
        }
    }

    showNotification(message, type = 'success') {
        const colors = {
            success: 'linear-gradient(to right, #00b09b, #96c93d)',
            error: 'linear-gradient(to right, #ff5f6d, #ffc371)',
            info: 'linear-gradient(to right, #2193b0, #6dd5ed)'
        };

        Toastify({
            text: message,
            duration: 3000,
            gravity: "top",
            position: "right",
            style: {
                background: colors[type]
            },
            onClick: function(){}
        }).showToast();
    }

    setupMonthlyCheck() {
        // Check more frequently during testing (every minute)
        setInterval(() => {
            const now = new Date();
            if (now.getMonth() !== this.currentMonth) {
                console.log('Month change detected!');
                console.log('Previous month:', this.currentMonth);
                console.log('New month:', now.getMonth());
                this.handleMonthChange();
                this.currentMonth = now.getMonth();
            }
        }, 60000); // Check every minute instead of every hour for testing
    }

    handleMonthChange() {
        try {
            // Get all data before archiving
            const allData = this.loadData();
            console.log('Data before archiving:', allData);
            
            // Get current month's data
            const currentMonthData = allData.filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate.getMonth() === this.currentMonth;
            });
            console.log('Data being archived:', currentMonthData);

            // Archive current month's data if exists
            if (currentMonthData.length > 0) {
                // Create archive key with year for proper organization
                const currentYear = new Date().getFullYear();
                const archiveKey = `bpData_${this.currentMonth}_${currentYear}`;
                
                // Get existing archived data for this month (if any)
                const existingArchive = JSON.parse(localStorage.getItem(archiveKey) || '[]');
                
                // Combine existing archive with new data and sort by date
                const updatedArchive = [...existingArchive, ...currentMonthData]
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
                
                // Save to archive
                localStorage.setItem(archiveKey, JSON.stringify(updatedArchive));
                console.log('Archived data saved:', archiveKey, updatedArchive);

                // Clear current data completely
                localStorage.setItem('bpData', '[]');
                console.log('Main data cleared for new month');
                
                // Update display and chart
                this.displayData();
                this.updateChart();

                // Force history update
                if (this.historyManager) {
                    setTimeout(() => {
                        this.historyManager.updateHistoryList();
                    }, 0);
                }

                this.showNotification('New month started! Previous month\'s data has been archived.', 'info');
            }
        } catch (error) {
            console.error('Month change error:', error);
            this.showNotification('Error during month change. Please check the console.', 'error');
        }
    }
}

// PDF Generation and Sharing
class PDFManager {
    constructor() {
        this.initializeButtons();
    }

    initializeButtons() {
        document.getElementById('downloadPDF').addEventListener('click', () => this.generatePDF(true));
        document.getElementById('sharePDF').addEventListener('click', () => this.generatePDF(false));
    }

    async generatePDF(isDownload, specificData = null) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');
        
        // Use specificData if provided, otherwise use current data
        const data = specificData || JSON.parse(localStorage.getItem('bpData') || '[]');
        const last30Days = data.slice(-30);

        // Add title
        doc.setFontSize(18);
        doc.text('Blood Pressure Report', 14, 20);

        // Add date range
        if (data.length > 0) {
            const startDate = new Date(data[0].date).toLocaleDateString();
            const endDate = new Date(data[data.length - 1].date).toLocaleDateString();
            doc.setFontSize(12);
            doc.text(`Period: ${startDate} to ${endDate}`, 14, 30);
        }

        // Add table
        let yPos = 40;
        doc.setFontSize(12);
        doc.text('Date', 14, yPos);
        doc.text('Systolic', 50, yPos);
        doc.text('Diastolic', 90, yPos);
        doc.text('Pulse', 130, yPos);
        doc.text('Comments', 170, yPos);

        data.forEach((item, index) => {
            yPos += 10;
            if (yPos > 180) { // Add new page if reaching bottom
                doc.addPage();
                yPos = 20;
            }
            doc.text(new Date(item.date).toLocaleDateString(), 14, yPos);
            doc.text(item.systolic.toString(), 50, yPos);
            doc.text(item.diastolic.toString(), 90, yPos);
            doc.text(item.pulse.toString(), 130, yPos);
            doc.text(item.comments || '', 170, yPos);
        });

        if (isDownload) {
            doc.save('blood-pressure-report.pdf');
        } else {
            const pdfBlob = doc.output('blob');
            if (navigator.share) {
                const file = new File([pdfBlob], 'blood-pressure-report.pdf', {
                    type: 'application/pdf'
                });
                await navigator.share({
                    files: [file],
                    title: 'Blood Pressure Report'
                });
            } else {
                alert('Sharing is not supported on this device/browser');
            }
        }
    }
}

// Add this new class after the existing classes
class Calendar {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.today = new Date();
        this.init();
        
        // Add automatic date and month updates
        this.setupAutoUpdate();
    }

    setupAutoUpdate() {
        // Check every minute for date/month changes
        setInterval(() => {
            const now = new Date();
            
            // Check if day has changed
            if (this.today.getDate() !== now.getDate() || 
                this.today.getMonth() !== now.getMonth() || 
                this.today.getFullYear() !== now.getFullYear()) {
                
                console.log('Date change detected');
                this.today = now;
                this.renderCalendar();
            }

            // Check if month has changed
            if (this.currentDate.getMonth() !== now.getMonth() || 
                this.currentDate.getFullYear() !== now.getFullYear()) {
                
                console.log('Month change detected');
                this.currentDate = new Date(now);
                this.renderCalendar();
                
                // Notify BPDataManager of month change if it exists
                if (window.bpDataManager) {
                    window.bpDataManager.handleMonthChange();
                }
            }
        }, 60000); // Check every minute

        // Calculate time until next midnight for first update
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const timeUntilMidnight = tomorrow - now;

        // Set up the first midnight update
        setTimeout(() => {
            this.today = new Date();
            this.renderCalendar();
            
            // Then update every 24 hours
            setInterval(() => {
                this.today = new Date();
                this.renderCalendar();
            }, 24 * 60 * 60 * 1000);
        }, timeUntilMidnight);
    }

    init() {
        this.renderCalendar();
        this.addNavigationListeners();
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const calendarDiv = document.getElementById('calendar');
        const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });

        let html = `
            <div class="w-full max-w-md mx-auto bg-white">
                <div class="flex items-center justify-between mb-6">
                    <button id="prevMonth" class="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <h2 class="text-base font-medium text-gray-900">${monthName}</h2>
                    <button id="nextMonth" class="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>

                <div class="grid grid-cols-7 mb-2">
                    <div class="text-sm text-gray-400 font-medium text-center">M</div>
                    <div class="text-sm text-gray-400 font-medium text-center">T</div>
                    <div class="text-sm text-gray-400 font-medium text-center">W</div>
                    <div class="text-sm text-gray-400 font-medium text-center">T</div>
                    <div class="text-sm text-gray-400 font-medium text-center">F</div>
                    <div class="text-sm text-gray-400 font-medium text-center">S</div>
                    <div class="text-sm text-gray-400 font-medium text-center">S</div>
                </div>

                <div class="grid grid-cols-7">
        `;

        // Calculate days
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const lastDayOfPrevMonth = new Date(year, month, 0).getDate();

        // Adjust for Monday start
        const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

        const totalDays = 42; // 6 rows × 7 days
        
        for (let i = 0; i < totalDays; i++) {
            const dayNumber = i - adjustedFirstDay + 1;
            const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
            const displayNumber = isCurrentMonth ? dayNumber : 
                dayNumber <= 0 ? lastDayOfPrevMonth + dayNumber :
                dayNumber - daysInMonth;

            const isToday = isCurrentMonth && 
                displayNumber === this.today.getDate() && 
                month === this.today.getMonth() && 
                year === this.today.getFullYear();

            const isSelected = this.selectedDate && 
                displayNumber === this.selectedDate.getDate() && 
                month === this.selectedDate.getMonth() && 
                year === this.selectedDate.getFullYear();

            const dayClasses = `
                p-2 text-center
                ${isCurrentMonth ? 'cursor-pointer' : 'pointer-events-none'}
            `;

            const innerSpanClasses = `
                flex items-center justify-center w-8 h-8 mx-auto rounded-full text-sm
                ${isCurrentMonth ? 'text-gray-900' : 'text-gray-300'}
                ${isSelected ? 'bg-black text-white' : ''}
                ${isToday && !isSelected ? 'bg-blue-100 text-blue-600 font-semibold' : ''}
                ${isCurrentMonth && !isToday && !isSelected ? 'hover:bg-gray-100' : ''}
                transition-colors duration-200
            `;

            html += `
                <div class="${dayClasses}" data-date="${year}-${month + 1}-${displayNumber}">
                    <span class="${innerSpanClasses}">${displayNumber}</span>
                </div>
            `;
        }

        html += '</div></div>';
        calendarDiv.innerHTML = html;

        // Add click handlers for days
        this.addDateClickListeners();
    }

    addDateClickListeners() {
        document.querySelectorAll('[data-date]').forEach(day => {
            day.addEventListener('click', (e) => {
                const [year, month, day] = e.currentTarget.dataset.date.split('-').map(Number);
                this.selectDate(year, month - 1, day);
            });
        });
    }

    selectDate(year, month, day) {
        this.selectedDate = new Date(year, month, day);
        this.renderCalendar();
    }

    addNavigationListeners() {
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });
    }
}

// History Management
class HistoryManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('toggleHistory').addEventListener('click', () => this.showHistory());
        document.getElementById('closeHistory').addEventListener('click', () => this.hideHistory());
    }

    showHistory() {
        const historyModal = document.getElementById('historyModal');
        historyModal.classList.remove('hidden');
        this.updateHistoryList();
    }

    hideHistory() {
        document.getElementById('historyModal').classList.add('hidden');
    }

    updateHistoryList() {
        // Get all localStorage keys
        const allKeys = Object.keys(localStorage);
        
        // Filter keys that start with 'bpData_' (archived months)
        const archiveKeys = allKeys.filter(key => key.startsWith('bpData_'));
        
        // Get current month's data
        const currentData = JSON.parse(localStorage.getItem('bpData') || '[]');
        
        // Combine all data
        let allMonthsData = {};
        
        // Add archived months data
        archiveKeys.forEach(key => {
            const data = JSON.parse(localStorage.getItem(key) || '[]');
            if (data.length > 0) {
                const date = new Date(data[0].date);
                const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                allMonthsData[monthYear] = data;
            }
        });
        
        // Add current month's data
        if (currentData.length > 0) {
            const currentDate = new Date();
            const currentMonthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            allMonthsData[currentMonthYear] = currentData;
        }

        // Update the history list
        const historyList = document.getElementById('historyList');
        
        if (Object.keys(allMonthsData).length === 0) {
            historyList.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    No historical data available
                </div>
            `;
            return;
        }

        historyList.innerHTML = Object.entries(allMonthsData)
            .sort(([a], [b]) => new Date(b) - new Date(a))
            .map(([monthYear, data]) => this.createMonthlyCard(monthYear, data))
            .join('');

        // Add event listeners to all buttons
        historyList.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const monthYear = e.currentTarget.dataset.month;
                this.viewMonthData(monthYear);
            });
        });

        // Download button listeners
        historyList.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const monthYear = e.currentTarget.parentElement.querySelector('.view-btn').dataset.month;
                this.downloadPDF(monthYear);
            });
        });

        // Share button listeners
        historyList.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const monthYear = e.currentTarget.parentElement.querySelector('.view-btn').dataset.month;
                this.sharePDF(monthYear);
            });
        });
    }

    createMonthlyCard(monthYear, data) {
        const [year, month] = monthYear.split('-');
        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
        const entriesCount = data.length;
        
        return `
            <div class="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <h3 class="text-xl font-semibold text-gray-800">${monthName}</h3>
                        <span class="text-sm text-gray-500">${entriesCount} entries</span>
                    </div>
                    <div class="flex gap-3">
                        <button class="view-btn flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                data-month="${monthYear}">
                            <i class="fas fa-eye mr-2"></i>
                            View
                        </button>
                        <button class="download-btn flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                data-month="${monthYear}">
                            <i class="fas fa-download mr-2"></i>
                            Download
                        </button>
                        <button class="share-btn flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                                data-month="${monthYear}">
                            <i class="fas fa-share-alt mr-2"></i>
                            Share
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    viewMonthData(monthYear) {
        const monthData = this.getMonthData(monthYear);
        
        if (monthData.length > 0) {
            // Sort data by date before displaying
            const sortedData = [...monthData].sort((a, b) => new Date(a.date) - new Date(b.date));
            
            bpDataManager.updateChart(sortedData);
            bpDataManager.displayData(sortedData);
            
            const [year, month] = monthYear.split('-');
            this.showNotification(`Viewing data for ${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`, 'info');
        } else {
            this.showNotification('No data available for this month', 'info');
        }
        
        this.hideHistory();
    }

    async downloadPDF(monthYear) {
        const monthData = this.getMonthData(monthYear);
        if (monthData.length > 0) {
            await new PDFManager().generatePDF(true, monthData);
            this.showNotification('PDF report generated successfully!', 'success');
        } else {
            this.showNotification('No data available to generate PDF', 'error');
        }
    }

    async sharePDF(monthYear) {
        const monthData = this.getMonthData(monthYear);
        if (monthData.length > 0) {
            await new PDFManager().generatePDF(false, monthData);
        } else {
            this.showNotification('No data available to share', 'error');
        }
    }

    getMonthData(monthYear) {
        const [year, month] = monthYear.split('-');
        const archiveKey = `bpData_${parseInt(month) - 1}_${year}`;
        
        // Try to get data from archive first
        let monthData = JSON.parse(localStorage.getItem(archiveKey) || '[]');
        
        // If no archived data, check if it's current month
        if (monthData.length === 0) {
            const currentData = JSON.parse(localStorage.getItem('bpData') || '[]');
            const now = new Date();
            const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            
            if (monthYear === currentMonthYear) {
                monthData = currentData;
            }
        }

        return monthData;
    }

    showNotification(message, type = 'info') {
        const colors = {
            success: 'linear-gradient(to right, #00b09b, #96c93d)',
            error: 'linear-gradient(to right, #ff5f6d, #ffc371)',
            info: 'linear-gradient(to right, #2193b0, #6dd5ed)'
        };

        Toastify({
            text: message,
            duration: 3000,
            gravity: "top",
            position: "right",
            style: {
                background: colors[type]
            }
        }).showToast();
    }

    refreshCurrentMonthView(monthYear) {
        const currentViewMonth = document.querySelector('.view-btn')?.dataset?.month;
        if (currentViewMonth === monthYear) {
            const monthData = this.getMonthData(monthYear);
            if (monthData.length > 0) {
                bpDataManager.updateChart(monthData);
                bpDataManager.displayData(monthData);
            }
        }
    }
}

// Initialize the application
let bpDataManager; // Declare globally

document.addEventListener('DOMContentLoaded', () => {
    const userManager = new UserManager();
    const historyManager = new HistoryManager();
    bpDataManager = new BPDataManager();
    bpDataManager.setHistoryManager(historyManager);
    const pdfManager = new PDFManager();
    const calendar = new Calendar();
});