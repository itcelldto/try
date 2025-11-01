// Global variables
let drData = [];
let tableRows = [];
let settingsData = {
    treasuries: [],
    pensionerTypes: []
};

// Google Sheets configuration
const SHEET_ID = "11oRitOvxaUmQIP6cAFBBTBXMnSV_ZIw6DD9aL_RpILc";
const API_KEY = "AIzaSyBAuS3Brpsw5JOJnjNJii1UlFa7ClXf8d4";

document.addEventListener('DOMContentLoaded', function() {
    // Initialize flatpickr for date inputs with editable option
    flatpickr("#fromDate", {
        altInput: true,
        altFormat: "d/m/Y",
        dateFormat: "Y-m-d",
        defaultDate: new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1),
        allowInput: true
    });
    
    flatpickr("#toDate", {
        altInput: true,
        altFormat: "d/m/Y",
        dateFormat: "Y-m-d",
        defaultDate: new Date(),
        allowInput: true
    });
    
    // Initialize date inputs and calculate period
    initializeDates();
    
    // Set up event listeners
    document.getElementById('fromDate').addEventListener('change', calculatePeriod);
    document.getElementById('toDate').addEventListener('change', calculatePeriod);
    document.getElementById('calculateBtn').addEventListener('click', calculateRevision);
    document.getElementById('resetBtn').addEventListener('click', resetForm);
    document.getElementById('printBtn').addEventListener('click', printCalculation);
    document.getElementById('pensionerType').addEventListener('change', fetchDRData);
    document.getElementById('addRowBtn').addEventListener('click', addNewRow);
    
    // Fetch settings data from Google Sheets
    fetchSettingsData();
});

// Initialize dates for calculation period
function initializeDates() {
    calculatePeriod();
}

// Calculate period when dates change
function calculatePeriod() {
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    const yearsInput = document.getElementById('years');
    const monthsInput = document.getElementById('months');
    const daysInput = document.getElementById('days');
    
    const fromDate = new Date(fromDateInput.value);
    const toDate = new Date(toDateInput.value);
    
    if (fromDate && toDate && fromDate <= toDate) {
        let years = toDate.getFullYear() - fromDate.getFullYear();
        let months = toDate.getMonth() - fromDate.getMonth();
        let days = toDate.getDate() - fromDate.getDate();
        
        if (days < 0) {
            months--;
            const prevMonth = new Date(toDate.getFullYear(), toDate.getMonth(), 0);
            days += prevMonth.getDate();
        }
        
        if (months < 0) {
            years--;
            months += 12;
        }
        
        yearsInput.value = years;
        monthsInput.value = months;
        daysInput.value = days;
    }
}

// Fetch settings data from Google Sheets
async function fetchSettingsData() {
    try {
        showLoadingState(true);
        
        const treasuryResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Settings!A2:A?key=${API_KEY}`);
        const treasuryData = await treasuryResponse.json();
        
        const pensionTypeResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Settings!B2:B?key=${API_KEY}`);
        const pensionTypeData = await pensionTypeResponse.json();
        
        settingsData.treasuries = treasuryData.values ? treasuryData.values.flat().filter(val => val.trim() !== '') : [];
        settingsData.pensionerTypes = pensionTypeData.values ? pensionTypeData.values.flat().filter(val => val.trim() !== '') : [];
        
        populateSettingsDropdowns();
        showLoadingState(false);
        
    } catch (error) {
        console.error('Error fetching settings data:', error);
        document.getElementById('treasury').innerHTML = '<option value="">Error loading treasuries</option>';
        document.getElementById('pensionerType').innerHTML = '<option value="">Error loading pension types</option>';
        showLoadingState(false);
    }
}

// Show/hide loading state
function showLoadingState(isLoading) {
    const treasurySelect = document.getElementById('treasury');
    const pensionTypeSelect = document.getElementById('pensionerType');
    
    if (isLoading) {
        treasurySelect.innerHTML = '<option value="">Loading treasuries...</option>';
        pensionTypeSelect.innerHTML = '<option value="">Loading pension types...</option>';
        treasurySelect.disabled = true;
        pensionTypeSelect.disabled = true;
    } else {
        treasurySelect.disabled = false;
        pensionTypeSelect.disabled = false;
    }
}

// Populate settings dropdowns
function populateSettingsDropdowns() {
    const treasurySelect = document.getElementById('treasury');
    const pensionerTypeSelect = document.getElementById('pensionerType');
    
    treasurySelect.innerHTML = '<option value="">Select Treasury</option>';
    pensionerTypeSelect.innerHTML = '<option value="">Select Pensioner Type</option>';
    
    settingsData.treasuries.forEach(treasury => {
        const option = document.createElement('option');
        option.value = treasury;
        option.textContent = treasury;
        treasurySelect.appendChild(option);
    });
    
    settingsData.pensionerTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        pensionerTypeSelect.appendChild(option);
    });
}

// Fetch DR data from Google Sheets based on selected pensioner type
async function fetchDRData() {
    const pensionerType = document.getElementById('pensionerType').value;
    
    if (!pensionerType) {
        document.getElementById('drTableStatus').textContent = 'Please select a pensioner type to load DR data';
        document.getElementById('drTableStatus').className = 'alert alert-info';
        document.getElementById('drTable').style.display = 'none';
        return;
    }
    
    try {
        document.getElementById('drTableStatus').textContent = 'Loading DR data...';
        document.getElementById('drTableStatus').className = 'alert alert-warning';
        
        const drResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${pensionerType}!C2:F?key=${API_KEY}`);
        const drDataResponse = await drResponse.json();
        
        if (!drDataResponse.values || drDataResponse.values.length === 0) {
            document.getElementById('drTableStatus').textContent = 'No DR data available for selected pension type';
            document.getElementById('drTableStatus').className = 'alert alert-warning';
            document.getElementById('drTable').style.display = 'none';
            drData = [];
            return;
        }
        
        drData = drDataResponse.values.map(row => ({
            fromDate: row[0] || '',
            toDate: row[1] || '',
            revisionNo: row[2] || '',
            drDue: parseFloat(row[3] ? row[3].replace('%', '') : 0) || 0
        })).filter(item => item.fromDate && item.toDate);
        
        populateRevisionNoDropdowns();
        
        document.getElementById('drTableStatus').textContent = `DR data loaded for ${pensionerType}. Click Calculate to generate table.`;
        document.getElementById('drTableStatus').className = 'alert alert-success';
        
    } catch (error) {
        console.error('Error fetching DR data:', error);
        document.getElementById('drTableStatus').textContent = 'Error loading DR data. Please try again.';
        document.getElementById('drTableStatus').className = 'alert alert-danger';
        document.getElementById('drTable').style.display = 'none';
        drData = [];
    }
}

// Populate Revision No dropdowns
function populateRevisionNoDropdowns() {
    const revisionNoFrom = document.getElementById('revisionNoFrom');
    const revisionNoTo = document.getElementById('revisionNoTo');
    
    revisionNoFrom.innerHTML = '<option value="">Select Revision No</option>';
    revisionNoTo.innerHTML = '<option value="">Select Revision No</option>';
    
    const revisionNos = [...new Set(drData.map(item => item.revisionNo))].filter(val => val);
    
    revisionNos.forEach(revNo => {
        const optionFrom = document.createElement('option');
        optionFrom.value = revNo;
        optionFrom.textContent = revNo;
        revisionNoFrom.appendChild(optionFrom);
        
        const optionTo = document.createElement('option');
        optionTo.value = revNo;
        optionTo.textContent = revNo;
        revisionNoTo.appendChild(optionTo);
    });
}

// Parse date in dd/mm/yyyy format
function parseDate(dateString) {
    if (dateString.includes('/')) {
        const parts = dateString.split('/');
        return new Date(parts[2], parts[1] - 1, parts[0]);
    } else if (dateString.includes('-')) {
        return new Date(dateString);
    } else {
        return new Date(dateString);
    }
}

// Format date to DD/MM/YYYY for display in table
function formatDateToDDMMYYYY(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Calculate months between two dates
function calculateMonthsBetweenDates(fromDateStr, toDateStr) {
    const fromDate = parseDate(fromDateStr);
    const toDate = parseDate(toDateStr);
    
    let months = (toDate.getFullYear() - fromDate.getFullYear()) * 12;
    months += toDate.getMonth() - fromDate.getMonth();
    
    if (toDate.getDate() >= fromDate.getDate()) {
        months += 1;
    }
    
    return Math.max(months, 1);
}

// Clear DR table
function clearDRTable() {
    const tableBody = document.getElementById('drTableBody');
    const tableFooter = document.getElementById('drTableFooter');
    
    tableBody.innerHTML = '';
    tableFooter.innerHTML = '';
    tableRows = [];
    document.getElementById('addRowSection').style.display = 'none';
}

// Get DR% Due by date range and revision number
function getDRDueByDateRangeAndRevision(fromDate, toDate, revisionNo) {
    const from = parseDate(fromDate);
    const to = parseDate(toDate);
    
    const matchingRecord = drData.find(item => {
        const itemFrom = parseDate(item.fromDate);
        const itemTo = parseDate(item.toDate);
        const itemRevisionNo = item.revisionNo;
        
        return ((from >= itemFrom && from <= itemTo) || 
               (to >= itemFrom && to <= itemTo) ||
               (itemFrom >= from && itemFrom <= to)) &&
               itemRevisionNo === revisionNo;
    });
    
    return matchingRecord ? matchingRecord.drDue : 0;
}

// Get DR for a specific period from filtered data
function getDRForPeriod(fromDate, toDate, filteredData) {
    const from = parseDate(fromDate);
    const to = parseDate(toDate);
    
    const matchingRecord = filteredData.find(item => {
        const itemFrom = parseDate(item.fromDate);
        const itemTo = parseDate(item.toDate);
        
        return ((from >= itemFrom && from <= itemTo) || 
               (to >= itemFrom && to <= itemTo) ||
               (itemFrom >= from && itemFrom <= to));
    });
    
    return matchingRecord ? matchingRecord.drDue : 0;
}

// Round amount based on decimal value
function roundAmount(amount) {
    const decimal = amount - Math.floor(amount);
    if (decimal >= 0.5) {
        return Math.ceil(amount);
    } else {
        return Math.floor(amount);
    }
}

// Remove row from table
function removeRow(index) {
    tableRows.splice(index, 1);
    renderTable();
    updateGrandTotal();
}

// Add new row to table
function addNewRow() {
    const basicPensionDue = parseFloat(document.getElementById('basicPensionDue').value) || 0;
    const basicPensionDrawn = parseFloat(document.getElementById('basicPensionDrawn').value) || 0;
    const revisionNoFrom = document.getElementById('revisionNoFrom').value;
    const revisionNoTo = document.getElementById('revisionNoTo').value;
    
    let lastToDate = new Date();
    if (tableRows.length > 0) {
        lastToDate = new Date(parseDate(tableRows[tableRows.length - 1].toDate));
        lastToDate.setDate(lastToDate.getDate() + 1);
    }
    
    const newFromDate = formatDateToDDMMYYYY(lastToDate);
    const newToDate = formatDateToDDMMYYYY(new Date(lastToDate.getFullYear(), lastToDate.getMonth() + 1, lastToDate.getDate()));
    
    const months = calculateMonthsBetweenDates(newFromDate, newToDate);
    
    const drDue = getDRDueByDateRangeAndRevision(newFromDate, newToDate, revisionNoTo);
    const drawnDR = getDRDueByDateRangeAndRevision(newFromDate, newToDate, revisionNoFrom);
    
    const newRow = {
        fromDate: newFromDate,
        toDate: newToDate,
        dueBasicPension: basicPensionDue,
        drDue: drDue,
        amountDue: 0,
        drawnBasicPension: basicPensionDrawn,
        drawnDR: drawnDR,
        amountDrawn: 0,
        difference: 0,
        months: months,
        grossAmount: 0,
        revisionNoDue: revisionNoTo,
        revisionNoDrawn: revisionNoFrom
    };
    
    tableRows.push(newRow);
    renderTable();
    recalculateAllRows();
}

// Render table with current data - ALL FIELDS EDITABLE
function renderTable() {
    const tableBody = document.getElementById('drTableBody');
    tableBody.innerHTML = '';
    
    tableRows.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td><input type="text" class="editable-input" value="${row.fromDate}" data-field="fromDate" data-index="${index}"></td>
            <td><input type="text" class="editable-input" value="${row.toDate}" data-field="toDate" data-index="${index}"></td>
            <td><input type="number" class="editable-input" value="${row.dueBasicPension}" data-field="dueBasicPension" data-index="${index}"></td>
            <td>
                <div class="dr-due-container">
                    <input type="number" class="editable-input dr-due-input" value="${row.drDue}" data-field="drDue" data-index="${index}">
                    <span class="revision-label">Rev no.${row.revisionNoDue || 'N/A'}</span>
                </div>
            </td>
            <td><input type="number" class="editable-input amount-due" value="${row.amountDue}" data-field="amountDue" data-index="${index}"></td>
            
            <!-- Drawn Details -->
            <td><input type="number" class="editable-input drawn-basic-pension" value="${row.drawnBasicPension}" data-field="drawnBasicPension" data-index="${index}"></td>
            <td>
                <div class="dr-due-container">
                    <input type="number" class="editable-input drawn-dr" value="${row.drawnDR}" data-field="drawnDR" data-index="${index}">
                    <span class="revision-label">Rev no.${row.revisionNoDrawn || 'N/A'}</span>
                </div>
            </td>
            <td><input type="number" class="editable-input amount-drawn" value="${row.amountDrawn}" data-field="amountDrawn" data-index="${index}"></td>
            
            <!-- Difference Details -->
            <td><input type="number" class="editable-input difference" value="${row.difference}" data-field="difference" data-index="${index}"></td>
            <td><input type="number" class="editable-input months" value="${row.months}" data-field="months" data-index="${index}"></td>
            <td><input type="number" class="editable-input gross-amount" value="${row.grossAmount}" data-field="grossAmount" data-index="${index}"></td>
            
            <!-- Action Buttons -->
            <td class="action-buttons">
                <button class="btn btn-danger btn-sm remove-row" data-index="${index}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
    
    addEventListenersToTable();
}

// Add event listeners to table elements
function addEventListenersToTable() {
    document.querySelectorAll('.editable-input').forEach(input => {
        input.addEventListener('change', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const field = this.getAttribute('data-field');
            const value = this.value;
            
            if (field === 'fromDate' || field === 'toDate') {
                tableRows[index][field] = value;
                const months = calculateMonthsBetweenDates(
                    tableRows[index].fromDate, 
                    tableRows[index].toDate
                );
                tableRows[index].months = months;
                document.querySelector(`.months[data-index="${index}"]`).value = months;
                recalculateRowAmounts(index);
            } 
            else if (field === 'grossAmount') {
                // User manually edited gross amount - store it directly
                tableRows[index][field] = parseFloat(value) || 0;
            }
            else {
                tableRows[index][field] = parseFloat(value) || 0;
                
                // If difference or months are manually edited, recalculate gross amount
                if (field === 'difference' || field === 'months') {
                    recalculateGrossAmountFromInputs(index);
                } else {
                    recalculateRowAmounts(index);
                }
            }
            
            updateGrandTotal();
        });
    });
    
    document.querySelectorAll('.remove-row').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            removeRow(index);
        });
    });
}

// Recalculate amounts for a specific row
function recalculateRowAmounts(index) {
    const row = tableRows[index];
    
    // Calculate amounts with proper rounding
    const amountDue = row.dueBasicPension + (row.dueBasicPension * row.drDue / 100);
    const amountDrawn = row.drawnBasicPension + (row.drawnBasicPension * row.drawnDR / 100);
    const difference = amountDue - amountDrawn;
    
    // Update row data with rounded values
    row.amountDue = roundAmount(amountDue);
    row.amountDrawn = roundAmount(amountDrawn);
    row.difference = roundAmount(difference);
    
    // Calculate gross amount as Difference * Months
    row.grossAmount = roundAmount(row.difference * row.months);
    
    // Update table cells
    document.querySelector(`.amount-due[data-index="${index}"]`).value = row.amountDue;
    document.querySelector(`.amount-drawn[data-index="${index}"]`).value = row.amountDrawn;
    document.querySelector(`.difference[data-index="${index}"]`).value = row.difference;
    document.querySelector(`.gross-amount[data-index="${index}"]`).value = row.grossAmount;
}

// Recalculate gross amount from input values (when difference or months are manually edited)
function recalculateGrossAmountFromInputs(index) {
    const row = tableRows[index];
    
    // Get current values from input fields
    const differenceInput = document.querySelector(`.difference[data-index="${index}"]`);
    const monthsInput = document.querySelector(`.months[data-index="${index}"]`);
    
    const currentDifference = parseFloat(differenceInput.value) || 0;
    const currentMonths = parseFloat(monthsInput.value) || 0;
    
    // Calculate gross amount as Difference * Months
    row.grossAmount = roundAmount(currentDifference * currentMonths);
    
    // Update gross amount field
    document.querySelector(`.gross-amount[data-index="${index}"]`).value = row.grossAmount;
}

// Recalculate all rows
function recalculateAllRows() {
    tableRows.forEach((row, index) => {
        recalculateRowAmounts(index);
    });
    updateGrandTotal();
}

// Calculate revision when Calculate button is clicked
function calculateRevision() {
    const pensionerType = document.getElementById('pensionerType').value;
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    const basicPensionDue = parseFloat(document.getElementById('basicPensionDue').value) || 0;
    const revisionNoFrom = document.getElementById('revisionNoFrom').value;
    const revisionNoTo = document.getElementById('revisionNoTo').value;
    
    if (!pensionerType || !fromDate || !toDate || !revisionNoFrom || !revisionNoTo) {
        document.getElementById('drTableStatus').textContent = 'Please fill all required fields: Pensioner Type, From Date, To Date, Revision No From, and Revision No To';
        document.getElementById('drTableStatus').className = 'alert alert-warning';
        return;
    }
    
    if (drData.length === 0) {
        document.getElementById('drTableStatus').textContent = 'No DR data available. Please select a valid pensioner type.';
        document.getElementById('drTableStatus').className = 'alert alert-warning';
        return;
    }
    
    try {
        document.getElementById('drTableStatus').textContent = 'Calculating...';
        document.getElementById('drTableStatus').className = 'alert alert-warning';
        
        clearDRTable();
        
        const tableBody = document.getElementById('drTableBody');
        const tableFooter = document.getElementById('drTableFooter');
        tableRows = [];
        
        const basicPensionDrawn = parseFloat(document.getElementById('basicPensionDrawn').value) || 0;
        const userFromDate = new Date(fromDate);
        const userToDate = new Date(toDate);
        
        const filteredDRDataDue = drData.filter(item => {
            const itemFrom = parseDate(item.fromDate);
            const itemTo = parseDate(item.toDate);
            return (itemFrom <= userToDate && itemTo >= userFromDate) && 
                   item.revisionNo === revisionNoTo;
        });
        
        const filteredDRDataDrawn = drData.filter(item => {
            const itemFrom = parseDate(item.fromDate);
            const itemTo = parseDate(item.toDate);
            return (itemFrom <= userToDate && itemTo >= userFromDate) && 
                   item.revisionNo === revisionNoFrom;
        });
        
        if (filteredDRDataDue.length === 0 || filteredDRDataDrawn.length === 0) {
            document.getElementById('drTableStatus').textContent = 'No DR data available for the selected date range and revision numbers';
            document.getElementById('drTableStatus').className = 'alert alert-warning';
            return;
        }
        
        filteredDRDataDue.sort((a, b) => parseDate(a.fromDate) - parseDate(b.fromDate));
        filteredDRDataDrawn.sort((a, b) => parseDate(a.fromDate) - parseDate(b.fromDate));
        
        const calculationPeriods = [];
        
        for (let i = 0; i < filteredDRDataDue.length; i++) {
            const currentRow = filteredDRDataDue[i];
            let periodFromDate, periodToDate;
            
            if (i === 0) {
                periodFromDate = formatDateToDDMMYYYY(userFromDate);
            } else {
                const prevToDate = new Date(parseDate(calculationPeriods[i-1].toDate));
                prevToDate.setDate(prevToDate.getDate() + 1);
                periodFromDate = formatDateToDDMMYYYY(prevToDate);
            }
            
            const drToDate = parseDate(currentRow.toDate);
            const periodToDateObj = drToDate < userToDate ? drToDate : userToDate;
            periodToDate = formatDateToDDMMYYYY(periodToDateObj);
            
            if (parseDate(periodFromDate) > parseDate(periodToDate)) {
                periodFromDate = periodToDate;
            }
            
            const drawnDRForPeriod = getDRForPeriod(periodFromDate, periodToDate, filteredDRDataDrawn);
            
            calculationPeriods.push({
                fromDate: periodFromDate,
                toDate: periodToDate,
                dueBasicPension: basicPensionDue,
                drDue: currentRow.drDue,
                revisionNoDue: currentRow.revisionNo,
                drawnBasicPension: basicPensionDrawn,
                drawnDR: drawnDRForPeriod,
                revisionNoDrawn: revisionNoFrom
            });
            
            if (periodToDateObj.getTime() === userToDate.getTime()) {
                break;
            }
        }
        
        let grandTotal = 0;
        
        calculationPeriods.forEach((row, index) => {
            const months = calculateMonthsBetweenDates(row.fromDate, row.toDate);
            
            const amountDue = row.dueBasicPension + (row.dueBasicPension * row.drDue / 100);
            const amountDrawn = row.drawnBasicPension + (row.drawnBasicPension * row.drawnDR / 100);
            const difference = amountDue - amountDrawn;
            
            // CORRECTED: Gross Amount = Difference * No. of Months
            const grossAmount = difference * months;
            
            const roundedAmountDue = roundAmount(amountDue);
            const roundedAmountDrawn = roundAmount(amountDrawn);
            const roundedDifference = roundAmount(difference);
            const roundedGrossAmount = roundAmount(grossAmount);
            
            grandTotal += roundedGrossAmount;
            
            tableRows.push({
                fromDate: row.fromDate,
                toDate: row.toDate,
                dueBasicPension: row.dueBasicPension,
                drDue: row.drDue,
                amountDue: roundedAmountDue,
                drawnBasicPension: row.drawnBasicPension,
                drawnDR: row.drawnDR,
                amountDrawn: roundedAmountDrawn,
                difference: roundedDifference,
                months: months,
                grossAmount: roundedGrossAmount,
                revisionNoDue: row.revisionNoDue,
                revisionNoDrawn: row.revisionNoDrawn
            });
        });
        
        renderTable();
        
        tableFooter.innerHTML = `
            <tr class="total-row">
                <td colspan="11" class="text-end"><strong>Grand Total:</strong></td>
                <td><strong id="grandTotal">${Math.ceil(grandTotal)}</strong></td>
            </tr>
        `;
        
        document.getElementById('drTable').style.display = 'table';
        document.getElementById('addRowSection').style.display = 'block';
        document.getElementById('drTableStatus').textContent = `Calculation completed. ${calculationPeriods.length} period(s) calculated.`;
        document.getElementById('drTableStatus').className = 'alert alert-success';
        
    } catch (error) {
        console.error('Error calculating revision:', error);
        document.getElementById('drTableStatus').textContent = 'Error during calculation. Please check your inputs.';
        document.getElementById('drTableStatus').className = 'alert alert-danger';
    }
}

// Update grand total when values change
function updateGrandTotal() {
    let grandTotal = 0;
    tableRows.forEach(row => {
        grandTotal += row.grossAmount;
    });
    document.getElementById('grandTotal').textContent = Math.ceil(grandTotal);
}

// Reset form to initial state
function resetForm() {
    document.getElementById('treasury').value = '';
    document.getElementById('pensionerType').value = '';
    document.getElementById('pensionerCode').value = '';
    document.getElementById('pensionerName').value = '';
    document.getElementById('basicPensionDrawn').value = '';
    document.getElementById('drawnDR').value = '';
    document.getElementById('basicPensionDue').value = '';
    document.getElementById('revisionNoFrom').value = '';
    document.getElementById('revisionNoTo').value = '';
    initializeDates();
    clearDRTable();
    document.getElementById('drTableStatus').textContent = 'Please fill all details and click Calculate to generate the table.';
    document.getElementById('drTableStatus').className = 'alert alert-info';
    document.getElementById('drTable').style.display = 'none';
}

// Print calculation
function printCalculation() {
    if (tableRows.length === 0) {
        alert('Please calculate first before printing.');
        return;
    }
    
    document.getElementById('printPensionerName').textContent = 
        document.getElementById('pensionerName').value.toUpperCase() || 'NOT PROVIDED';
    
    const treasury = document.getElementById('treasury').value;
    const pensionerType = document.getElementById('pensionerType').value;
    const pensionerCode = document.getElementById('pensionerCode').value;
    const fullPensionerCode = `${treasury} - ${pensionerType} / ${pensionerCode}`;
    document.getElementById('printPensionerCode').textContent = fullPensionerCode || 'NOT PROVIDED';
    
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    
    if (fromDate) {
        const fromDateObj = new Date(fromDate);
        document.getElementById('printFromDate').textContent = formatDateToDDMMYYYY(fromDateObj);
    } else {
        document.getElementById('printFromDate').textContent = 'NOT PROVIDED';
    }
    
    if (toDate) {
        const toDateObj = new Date(toDate);
        document.getElementById('printToDate').textContent = formatDateToDDMMYYYY(toDateObj);
    } else {
        document.getElementById('printToDate').textContent = 'NOT PROVIDED';
    }
    
    const printTableBody = document.getElementById('printTableBody');
    printTableBody.innerHTML = '';
    
    let grandTotal = 0;
    
    tableRows.forEach((row, index) => {
        grandTotal += row.grossAmount;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.fromDate}</td>
            <td>${row.toDate}</td>
            <td>${row.dueBasicPension}</td>
            <td>${row.drDue}%</td>
            <td>${row.amountDue}</td>
            <td>${row.drawnBasicPension}</td>
            <td>${row.drawnDR}%</td>
            <td>${row.amountDrawn}</td>
            <td>${row.difference}</td>
            <td>${row.months}</td>
            <td>${row.grossAmount}</td>
        `;
        printTableBody.appendChild(tr);
    });
    
    const totalRow = document.createElement('tr');
    totalRow.className = 'total-row';
    totalRow.innerHTML = `
        <td colspan="10" class="text-end"><strong>Grand Total:</strong></td>
        <td><strong>${Math.ceil(grandTotal)}</strong></td>
    `;
    printTableBody.appendChild(totalRow);
    
    document.getElementById('printSection').style.display = 'block';
    window.print();
    document.getElementById('printSection').style.display = 'none';
}
