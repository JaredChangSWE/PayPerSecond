document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const monthlySalaryInput = document.getElementById('monthlySalary');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const saveSettingsButton = document.getElementById('saveSettings');
    const salaryDisplay = document.getElementById('salaryDisplay');

    // --- Settings Management ---
    function saveSettings() {
        const monthlySalary = parseFloat(monthlySalaryInput.value);
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;

        // Basic Validation
        if (isNaN(monthlySalary) || monthlySalary <= 0) {
            alert('Please enter a valid monthly salary.');
            return;
        }
        if (!startTime || !endTime) {
            alert('Please enter valid start and end times.');
            return;
        }
        if (startTime >= endTime) {
            alert('End time must be after start time.');
            return;
        }

        localStorage.setItem('monthlySalary', monthlySalary);
        localStorage.setItem('startTime', startTime);
        localStorage.setItem('endTime', endTime);
        alert('Settings saved!');
        // Immediately try to update salary display based on new settings
        calculateAndDisplaySalary(); 
    }

    function loadSettings() {
        const monthlySalary = localStorage.getItem('monthlySalary');
        const startTime = localStorage.getItem('startTime');
        const endTime = localStorage.getItem('endTime');

        if (monthlySalary) {
            monthlySalaryInput.value = monthlySalary;
        }
        if (startTime) {
            startTimeInput.value = startTime;
        }
        if (endTime) {
            endTimeInput.value = endTime;
        }
    }

    // --- Salary Calculation and Display ---
    let salaryInterval = null; // To store the interval ID

    function calculateAndDisplaySalary() {
        // Clear any existing interval
        if (salaryInterval) {
            clearInterval(salaryInterval);
            salaryInterval = null;
        }

        const monthlySalary = parseFloat(localStorage.getItem('monthlySalary'));
        const startTimeString = localStorage.getItem('startTime');
        const endTimeString = localStorage.getItem('endTime');

        if (isNaN(monthlySalary) || !startTimeString || !endTimeString) {
            salaryDisplay.textContent = '0.00'; // Or 'Configure settings'
            // console.log('Settings not configured or invalid.');
            return;
        }

        // --- Time Calculations ---
        const now = new Date();
        const currentDay = now.toISOString().split('T')[0]; // YYYY-MM-DD

        const workStartTime = new Date(`${currentDay}T${startTimeString}`);
        const workEndTime = new Date(`${currentDay}T${endTimeString}`);

        // Assuming 22 working days per month as a common average
        // This could be made more precise or configurable if needed
        const workingDaysPerMonth = 22; 
        const dailySalary = monthlySalary / workingDaysPerMonth;
        
        const totalWorkMillisecondsInDay = workEndTime - workStartTime;
        if (totalWorkMillisecondsInDay <= 0) {
            // console.error("Total work milliseconds is zero or negative. Check start/end times.");
            salaryDisplay.textContent = 'Error!';
            return;
        }
        const salaryPerMillisecond = dailySalary / totalWorkMillisecondsInDay;

        function updateSalary() {
            const currentTime = new Date();

            if (currentTime >= workStartTime && currentTime <= workEndTime) {
                const elapsedMillisecondsToday = currentTime - workStartTime;
                const accumulatedSalaryToday = elapsedMillisecondsToday * salaryPerMillisecond;
                salaryDisplay.textContent = accumulatedSalaryToday.toFixed(2);
            } else {
                // If outside working hours, show 0 or the total for the last worked period.
                // For simplicity, if it's before work start, show 0.
                // If after work end, show the total for the day.
                if (currentTime < workStartTime) {
                    salaryDisplay.textContent = '0.00';
                } else if (currentTime > workEndTime) {
                    const totalAccumulated = totalWorkMillisecondsInDay * salaryPerMillisecond;
                    salaryDisplay.textContent = totalAccumulated.toFixed(2);
                    if (salaryInterval) clearInterval(salaryInterval); // Stop updating after work hours
                }
                // No active accumulation if outside work hours for the current day
            }
        }
        
        updateSalary(); // Initial call
        salaryInterval = setInterval(updateSalary, 1000); // Update every second
    }

    // --- Event Listeners ---
    saveSettingsButton.addEventListener('click', saveSettings);

    // --- Initial Load ---
    loadSettings();
    calculateAndDisplaySalary(); // Attempt to calculate on load
});
