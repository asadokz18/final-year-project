// ============================================
// Online Payment Page JS
// ============================================

const API = 'api/user.php';
const AUTH = 'api/auth.php';

document.addEventListener('DOMContentLoaded', async () => {
    const feeId = new URLSearchParams(window.location.search).get('fee_id');
    if (!feeId) {
        alert('Invalid Access: No Fee ID provided.');
        window.history.back();
        return;
    }

    await checkAuth();
    loadFeeDetails(feeId);
    setupEventListeners();
});

async function checkAuth() {
    const fd = new FormData();
    fd.append('action', 'check_session');
    try {
        const res = await fetch(AUTH, { method: 'POST', body: fd, credentials: 'include' });
        const data = await res.json();
        if (!data.logged_in || data.user_role === 'Admin') {
            window.location.href = 'login.html';
            return;
        }
        
        // Update back button link based on role
        const backBtn = document.getElementById('backBtn');
        const role = data.user_role.toLowerCase();
        backBtn.href = `${role}/dashboard.html`;
    } catch (e) {
        window.location.href = 'login.html';
    }
}

async function loadFeeDetails(feeId) {
    const banner = document.getElementById('feeBanner');
    try {
        const res = await fetch(`${API}?action=get_my_fees`, { credentials: 'include' });
        const data = await res.json();
        
        if (data.success) {
            const fee = data.fees.find(f => f.id == feeId);
            if (!fee) {
                banner.innerHTML = '<div class="alert alert-danger">Fee record not found.</div>';
                return;
            }
            
            document.getElementById('payFeeId').value = fee.id;
            banner.innerHTML = `
                <div class="fee-info">
                    <h2>${fee.fee_month} ${fee.fee_year}</h2>
                    <p>Status: ${fee.status}</p>
                </div>
                <div class="fee-amount">
                    <span class="label">Amount Due</span>
                    <span class="value">Rs. ${parseFloat(fee.amount).toLocaleString()}</span>
                </div>
            `;
        } else {
            banner.innerHTML = '<div class="alert alert-danger">Failed to load fee details.</div>';
        }
    } catch (e) {
        banner.innerHTML = '<div class="alert alert-danger">Connection error.</div>';
    }
}

function setupEventListeners() {
    // Payment Method selection
    document.querySelectorAll('.method-card').forEach(card => {
        card.addEventListener('click', function() {
            document.querySelectorAll('.method-card').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const radio = this.querySelector('input[type="radio"]');
            radio.checked = true;
            
            // Toggle Bank Selection
            const bankGroup = document.getElementById('bankSelectionGroup');
            if (radio.value === 'Bank Transfer') {
                bankGroup.style.display = 'block';
            } else {
                bankGroup.style.display = 'none';
            }
        });
    });

    // Bank card selection
    document.querySelectorAll('.bank-card').forEach(card => {
        card.addEventListener('click', function() {
            document.querySelectorAll('.bank-card').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            this.querySelector('input[type="radio"]').checked = true;
        });
    });

    // File upload preview
    const fileInput = document.getElementById('payProof');
    const dummy = document.querySelector('.file-dummy');
    const preview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');

    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            dummy.style.display = 'none';
            preview.style.display = 'flex';
            fileName.textContent = this.files[0].name;
        }
    });

    // Drag and Drop
    const dropZone = document.getElementById('dropZone');
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        }, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        }, false);
    });
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change'));
    });

    // Form Submission
    document.getElementById('paymentForm').addEventListener('submit', submitPayment);
}

function removeFile() {
    const fileInput = document.getElementById('payProof');
    const dummy = document.querySelector('.file-dummy');
    const preview = document.getElementById('filePreview');
    fileInput.value = '';
    dummy.style.display = 'block';
    preview.style.display = 'none';
}

async function submitPayment(e) {
    e.preventDefault();
    const alertBox = document.getElementById('paymentAlert');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');

    const feeId = document.getElementById('payFeeId').value;
    const method = document.querySelector('input[name="payMethod"]:checked').value;
    const trxId = document.getElementById('payTrxId').value.trim();
    const fileInput = document.getElementById('payProof');
    const bankSelect = document.querySelector('input[name="bankSelect"]:checked');

    if (!trxId) {
        alertBox.innerHTML = '<div class="alert alert-warning">Please enter the Transaction ID.</div>';
        return;
    }
    if (!fileInput.files[0]) {
        alertBox.innerHTML = '<div class="alert alert-warning">Please upload a screenshot of the payment.</div>';
        return;
    }

    let finalMethod = method;
    if (method === 'Bank Transfer') {
        if (!bankSelect) {
            alertBox.innerHTML = '<div class="alert alert-warning">Please select a bank for transfer.</div>';
            return;
        }
        finalMethod = `Bank Transfer (${bankSelect.value})`;
    }

    const fd = new FormData();
    fd.append('action', 'submit_fee_payment');
    fd.append('fee_id', feeId);
    fd.append('payment_method', finalMethod);
    fd.append('transaction_id', trxId);
    fd.append('payment_proof', fileInput.files[0]);

    // Loading State
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'block';

    try {
        const res = await fetch(API, { method: 'POST', body: fd, credentials: 'include' });
        const data = await res.json();
        
        alertBox.innerHTML = data.success 
            ? `<div class="alert alert-success"><i class="fas fa-check-circle"></i> ${data.message}</div>` 
            : `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i> ${data.message}</div>`;
        
        if (data.success) {
            setTimeout(() => {
                const backUrl = document.getElementById('backBtn').href;
                window.location.href = backUrl;
            }, 2000);
        }
    } catch (e) {
        alertBox.innerHTML = '<div class="alert alert-danger">Submission error. Please try again.</div>';
    } finally {
        submitBtn.disabled = false;
        btnText.style.display = 'block';
        btnSpinner.style.display = 'none';
    }
}
