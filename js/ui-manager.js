// js/ui-manager.js
// ===================================================================
// GESTOR DE INTERFAZ DE USUARIO (UI)
// Este archivo controla el DOM, maneja los eventos del usuario y orquesta la aplicación.
// Llama al motor-evaluador.js para los cálculos.
// ===================================================================

let matrices = null;
let parameters = null;
let configLoaded = false;
let companyData = { name: '', sector: '', employees: '', revenue: '', governance: { cybersecurityOwner: '', riskIntegration: '' }, priorities: [], riskProfile: { dataTypes: [] }, technicalCapabilities: { protectionSystems: '', passwordPolicy: '', backupFrequency: '', employeeTraining: '', assetInventory: '', incidentPlan: '', criticalDecisions: '' }, timeline: '', technicalCapacity: '', staffAvailability: '', outsourcingWillingness: '' };
let currentProfile = null;
let targetProfile = null;
let generatedPlan = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Planificador NIST...');
    loadConfigurationAndStartApp();
});

async function loadConfigurationAndStartApp() {
    try {
        const [matricesRes, parametrosRes] = await Promise.all([ fetch('data/matrices.json'), fetch('data/parametros.json') ]);
        matrices = await matricesRes.json();
        parameters = await parametrosRes.json();
        configLoaded = true;
        initializeApplication();
    } catch (error) {
        console.error('Error fatal al cargar la configuración:', error);
        showErrorScreen();
    }
}

function initializeApplication() {
    hideLoadingScreen();
    showMainApp();
    setupUI();
    setupEventListeners();
}

function hideLoadingScreen() { document.getElementById('loading-screen').style.display = 'none'; }
function showMainApp() { document.getElementById('main-app').style.display = 'block'; }
function showErrorScreen() { document.getElementById('loading-screen').style.display = 'none'; document.getElementById('error-screen').style.display = 'block'; }

function setupUI() {
    setupStepIndicators();
    setupSectorOptions();
    setupSecurityConcerns();
    setupUILimits();
}

function setupStepIndicators() {
    const container = document.getElementById('step-indicators');
    const steps = ['Información General', 'Capacidades Técnicas', 'Evaluación NIST', 'Recursos', 'Plan'];
    container.innerHTML = '';
    steps.forEach((stepName, index) => {
        const stepNum = index + 1;
        const indicator = document.createElement('div');
        indicator.className = 'text-center step-indicator';
        indicator.dataset.step = stepNum;
        indicator.innerHTML = `<div class="w-8 h-8 ${stepNum === 1 ? 'bg-primary' : 'bg-gray-300'} rounded-full flex items-center justify-center mx-auto"><span class="${stepNum === 1 ? 'text-white' : 'text-gray-600'} font-bold">${stepNum}</span></div><span class="text-xs mt-1 ${stepNum === 1 ? 'text-primary' : 'text-gray-500'} font-medium">${stepName}</span>`;
        container.appendChild(indicator);
    });
}

function setupSectorOptions() {
    const sectorSelect = document.getElementById('sector');
    const sectors = Object.keys(matrices.sectorSpecificRequirements);
    sectorSelect.innerHTML = '<option value="">Seleccione un sector</option>';
    sectors.forEach(sector => { const option = document.createElement('option'); option.value = sector; option.textContent = sector; sectorSelect.appendChild(option); });
}

function setupSecurityConcerns() {
    const container = document.getElementById('security-concerns-container');
    const concerns = [
        { value: "Protección de datos de clientes", title: "Protección de datos de clientes", description: "Garantizar la privacidad y seguridad de la información personal de clientes" },
        { value: "Continuidad del negocio", title: "Continuidad del negocio", description: "Asegurar la disponibilidad de servicios críticos ante incidentes" },
        { value: "Cumplimiento regulatorio", title: "Cumplimiento regulatorio", description: "Cumplir con leyes locales e internacionales (Ley 19.628, GDPR, etc.)" },
        { value: "Protección de propiedad intelectual", title: "Protección de propiedad intelectual", description: "Proteger secretos comerciales, patentes y activos intelectuales" },
        { value: "Seguridad de pagos", title: "Seguridad de pagos", description: "Proteger transacciones financieras y datos de tarjetas de crédito" }
    ];
    container.innerHTML = '';
    concerns.forEach(concern => {
        const div = document.createElement('div');
        div.className = 'security-concern';
        div.dataset.value = concern.value;
        div.innerHTML = `<label class="flex items-center cursor-pointer"><input type="checkbox" class="security-concern-checkbox mr-3" name="securityConcerns" value="${concern.value}"><div><div class="font-medium">${concern.title}</div><div class="text-sm text-gray-600 mt-1">${concern.description}</div></div></label>`;
        container.appendChild(div);
    });
}

function setupUILimits() {
    const maxConcerns = parameters.ui.maxSecurityConcerns;
    document.getElementById('max-concerns').textContent = maxConcerns;
    document.getElementById('max-concerns-text').textContent = maxConcerns;
}

function setupEventListeners() {
    function updateAllProfileDisplays() {
        if (currentProfile) { renderProfile(document.getElementById('current-profile'), currentProfile, targetProfile); }
        if (targetProfile) { renderProfile(document.getElementById('target-profile'), currentProfile, targetProfile); }
    }
    document.addEventListener('change', function(e) {
        saveCurrentStepData();
        validateButtons();
        if (canGenerateCurrentProfile()) { currentProfile = generateCurrentProfile(companyData, matrices); }
        if (canGenerateTargetProfile()) { targetProfile = generateTargetProfile(companyData, currentProfile, matrices, parameters); }
        updateAllProfileDisplays();
        if (e.target.name === 'securityConcerns') { handleSecurityConcernSelection(e); }
    });
    document.addEventListener('click', function(e) { if (e.target.closest('.security-concern') && !e.target.matches('input[type="checkbox"]')) { handleSecurityConcernClick(e); } });
    const toggleCheckbox = document.getElementById('toggle-legends-checkbox');
    if (toggleCheckbox) {
        toggleCheckbox.addEventListener('change', (e) => {
            const legends = document.querySelectorAll('.helper-text');
            legends.forEach(legend => { legend.style.display = e.target.checked ? 'block' : 'none'; });
        });
    }
    validateButtons();
}

function handleSecurityConcernSelection(e) {
    const checked = document.querySelectorAll('input[name="securityConcerns"]:checked');
    const maxConcerns = parameters.ui.maxSecurityConcerns;
    if (checked.length > maxConcerns) { e.target.checked = false; alert(`Solo puede seleccionar máximo ${maxConcerns} preocupaciones principales`); } else { const concern = e.target.closest('.security-concern'); if (concern) concern.classList.toggle('selected', e.target.checked); }
}

function handleSecurityConcernClick(e) {
    const concern = e.target.closest('.security-concern');
    const checkbox = concern.querySelector('input[type="checkbox"]');
    const checked = document.querySelectorAll('input[name="securityConcerns"]:checked');
    const maxConcerns = parameters.ui.maxSecurityConcerns;
    if (!checkbox.checked && checked.length >= maxConcerns) { alert(`Solo puede seleccionar máximo ${maxConcerns} preocupaciones principales`); return; }
    checkbox.checked = !checkbox.checked;
    concern.classList.toggle('selected', checkbox.checked);
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
}

function nextStep(step) {
    if (!configLoaded) return;
    saveCurrentStepData();
    document.querySelectorAll('.step-card').forEach(card => card.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
    const progressPercent = step * parameters.ui.progressPercentPerStep;
    document.getElementById('progress-bar').style.width = `${progressPercent}%`;
    document.getElementById('progress-percent').textContent = progressPercent;
    document.getElementById('current-step').textContent = step;
    updateStepIndicators(step);
    if (step === 5) { generatedPlan = generateAdvancedPlan(currentProfile, targetProfile, companyData, matrices, parameters); renderPlan(generatedPlan); }
    validateButtons();
}

function prevStep(step) { nextStep(step); }

function updateStepIndicators(currentStep) {
    document.querySelectorAll('.step-indicator').forEach(indicator => {
        const indicatorStep = parseInt(indicator.dataset.step);
        const circle = indicator.querySelector('div');
        const text = indicator.querySelector('span');
        circle.classList.toggle('bg-primary', indicatorStep <= currentStep);
        circle.classList.toggle('bg-gray-300', indicatorStep > currentStep);
        text.classList.toggle('text-primary', indicatorStep <= currentStep);
        text.classList.toggle('text-gray-500', indicatorStep > currentStep);
    });
}

function saveCurrentStepData() {
    companyData.name = document.getElementById('companyName')?.value || '';
    companyData.sector = document.getElementById('sector')?.value || '';
    companyData.employees = document.getElementById('employees')?.value || '';
    companyData.revenue = document.getElementById('revenue')?.value || '';
    companyData.governance.cybersecurityOwner = document.getElementById('responsible')?.value || '';
    companyData.governance.riskIntegration = document.getElementById('riskIntegration')?.value || '';
    companyData.technicalCapabilities.protectionSystems = document.getElementById('protectionSystems')?.value || '';
    companyData.technicalCapabilities.passwordPolicy = document.getElementById('passwordPolicy')?.value || '';
    companyData.technicalCapabilities.backupFrequency = document.getElementById('backupFrequency')?.value || '';
    companyData.technicalCapabilities.employeeTraining = document.getElementById('employeeTraining')?.value || '';
    companyData.technicalCapabilities.assetInventory = document.getElementById('assetInventory')?.value || '';
    companyData.technicalCapabilities.incidentPlan = document.getElementById('incidentPlan')?.value || '';
    companyData.technicalCapabilities.criticalDecisions = document.getElementById('criticalDecisions')?.value || '';
    companyData.riskProfile.dataTypes = Array.from(document.querySelectorAll('input[name="dataTypes"]:checked')).map(cb => cb.value);
    companyData.priorities = Array.from(document.querySelectorAll('input[name="securityConcerns"]:checked')).map(cb => cb.value);
    companyData.timeline = document.getElementById('timeline')?.value || '';
    companyData.technicalCapacity = document.getElementById('techCapacity')?.value || '';
    companyData.staffAvailability = document.getElementById('staffAvailability')?.value || '';
    companyData.outsourcingWillingness = document.getElementById('outsourcing')?.value || '';
}

function validateButtons() {
    if (!parameters) return;
    const validation = parameters.validation;
    const step1Valid = validation.step1RequiredFields.every(field => companyData[field]);
    const step2Valid = validation.step2RequiredFields.every(field => companyData.governance[field]) && Object.values(companyData.technicalCapabilities).every(val => val) && companyData.riskProfile.dataTypes.length >= validation.step2MinDataTypes;
    const step3Valid = companyData.priorities.length >= validation.step3MinPriorities;
    const step4Valid = validation.step4RequiredFields.every(field => companyData[field.replace('Willingness', 'Willingness')]);
    document.getElementById('btn-step1').disabled = !step1Valid;
    document.getElementById('btn-step2').disabled = !step2Valid;
    document.getElementById('btn-step3').disabled = !step3Valid;
    document.getElementById('btn-step4').disabled = !step4Valid;
}

function canGenerateCurrentProfile() { return companyData.sector && Object.values(companyData.governance).every(v => v) && Object.values(companyData.technicalCapabilities).every(v => v) && companyData.riskProfile.dataTypes.length > 0; }
function canGenerateTargetProfile() { return companyData.sector && companyData.employees && companyData.revenue && companyData.technicalCapacity && companyData.staffAvailability && companyData.outsourcingWillingness; }

function renderProfile(container, current, target) {
    if (!current) {
        container.innerHTML = `<div class="text-center text-gray-500 py-4"><i class="fas fa-info-circle text-2xl mb-2"></i><p>Complete la información para ver su perfil.</p></div>`;
        return;
    }
    container.innerHTML = '';
    matrices.nistFunctions.forEach(func => {
        const currentLevel = current[func] || 0;
        const targetLevel = target ? target[func] : 0;
        const row = document.createElement('div');
        row.className = 'profile-row items-center';
        let dotsHTML = '';
        for (let i = 1; i <= 5; i++) {
            let dotClass = '';
            if (i <= currentLevel) { dotClass = 'active'; } 
            else if (i <= targetLevel) { dotClass = 'gap'; }
            dotsHTML += `<div class="level-dot ${dotClass}"></div>`;
        }
        row.innerHTML = `<div class="profile-label">${func}</div><div class="profile-levels">${dotsHTML}</div><span class="ml-4 font-medium text-primary w-20 text-right">${currentLevel} → ${targetLevel || '?'}</span>`;
        container.appendChild(row);
    });
}

function renderPlan(plan) {
    const container = document.getElementById('plan-content');
    if (!plan) {
        container.innerHTML = `<div class="text-center text-red-600 py-4 bg-red-50 rounded-lg"><i class="fas fa-exclamation-circle text-2xl mb-2"></i><p>❌ No se pudo generar el plan. Complete los pasos anteriores.</p></div>`;
        return;
    }
    const siiClass = matrices.siiClassification[companyData.revenue];
    const siiInfo = siiClass ? `<div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"><h4 class="font-semibold text-blue-800 mb-2">📊 Clasificación SII Chile</h4><p class="text-blue-700 text-sm"><strong>${siiClass.type.toUpperCase()}:</strong> ${siiClass.description} (Multiplicador: ${siiClass.baseMultiplier}x, Prioriza: ${siiClass.prioritizeFunctions.join(', ')})</p></div>` : '';
    let planHTML = `<div class="bg-gradient-to-r from-primary to-secondary text-white p-6 rounded-xl mb-8"><div class="flex items-center mb-4"><i class="fas fa-shield-alt text-3xl mr-4"></i><div><h3 class="text-2xl font-bold">Plan de Ciberseguridad NIST CSF 2.0</h3><p class="text-lg opacity-90">${companyData.name}</p></div></div><div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6"><div class="bg-white bg-opacity-20 p-4 rounded-lg"><h4 class="font-semibold mb-2">Timeline</h4><p class="text-xl font-bold">${plan.timeline}</p></div><div class="bg-white bg-opacity-20 p-4 rounded-lg"><h4 class="font-semibold mb-2">Reducción de Riesgo</h4><p class="text-xl font-bold">${plan.riskReduction}%</p></div><div class="bg-white bg-opacity-20 p-4 rounded-lg"><h4 class="font-semibold mb-2">Cumplimiento</h4><p class="text-xl font-bold">${plan.complianceAlignment}</p></div></div></div>${siiInfo}<div class="bg-white border border-gray-200 rounded-xl p-6 mb-8"><h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center"><i class="fas fa-chart-line text-primary mr-2"></i> Perfil Actual vs Objetivo</h4><div class="space-y-4">`;
    Object.entries(plan.currentProfile).forEach(([func, current]) => {
        const target = plan.targetProfile[func];
        let dotsHTML = '';
        for (let i = 1; i <= 5; i++) {
            let dotClass = '';
            if (i <= current) { dotClass = 'active'; } 
            else if (i <= target) { dotClass = 'gap'; }
            dotsHTML += `<div class="level-dot ${dotClass}" style="width: 20px; height: 20px;"></div>`;
        }
        planHTML += `<div class="profile-row items-center mb-3"><div class="profile-label">${func}</div><div class="profile-levels">${dotsHTML}</div><span class="ml-4 font-medium text-primary w-20 text-right">${current} → ${target}</span></div>`;
    });
    planHTML += `<div class="chart-legend mt-4"><div class="legend-item"><div class="legend-color-box bg-green-500 rounded-full" style="background-color: #10b981;"></div><span>Nivel Actual</span></div><div class="legend-item"><div class="legend-color-box bg-yellow-400 rounded-full" style="background-color: #f59e0b;"></div><span>Brecha al Objetivo</span></div><div class="legend-item"><div class="legend-color-box bg-gray-200 rounded-full" style="background-color: #e5e7eb;"></div><span>Fuera del Objetivo</span></div></div></div></div><div class="space-y-6"><h3 class="text-2xl font-bold text-gray-800 mb-6 flex items-center"><i class="fas fa-tasks text-primary mr-3"></i> Fases de Implementación</h3>`;
    plan.phases.forEach((phase) => {
        const priorityClass = phase.priority === 'CRÍTICO' ? 'priority-critical' : phase.priority === 'ALTO' ? 'priority-alto' : 'priority-medio';
        planHTML += `<div class="phase-card"><div class="phase-header"><h4 class="text-xl font-semibold text-gray-800">${phase.name}</h4><span class="${priorityClass}">${phase.priority}</span></div><div class="grid md:grid-cols-2 gap-6"><div><h5 class="font-semibold text-gray-700 mb-3 flex items-center"><i class="fas fa-list-check text-secondary mr-2"></i> Subcategorías NIST CSF 2.0</h5><div class="space-y-3">`;
        phase.subcategories.forEach(subcat => {
            planHTML += `<div class="subcategory-item pl-4"><div class="flex justify-between items-center mb-1"><span class="font-medium text-gray-800">${subcat.id}</span></div><p class="text-sm text-gray-600 font-medium">${subcat.name}</p><p class="text-sm text-gray-500 mt-1">${subcat.activity}</p>`;
            if (subcat.dependencyInfo) { planHTML += `<div class="mt-2"><p class="text-xs font-medium text-orange-600">⚠️ Requiere: ${subcat.dependencyInfo.requiresFirst.join(', ')}</p></div>`; }
            if (subcat.complianceInfo && subcat.complianceInfo.length > 0) { planHTML += `<div class="mt-2 flex flex-wrap gap-1">${subcat.complianceInfo.map(reg => `<span class="compliance-badge ${reg.level === 'OBLIGATORIO' ? 'compliance-obligatorio' : reg.level === 'RECOMENDADO' ? 'compliance-recomendado' : 'compliance-contributivo'}" title="${reg.description}">${reg.name}</span>`).join('')}</div>`; }
            planHTML += `</div>`;
        });
        planHTML += `</div></div><div><h5 class="font-semibold text-gray-700 mb-3 flex items-center"><i class="fas fa-info-circle text-accent mr-2"></i> Info de Implementación</h5><div class="space-y-3"><div><span class="text-sm font-medium text-gray-600">Timeline:</span><p class="text-gray-800 font-semibold">${phase.timeline}</p></div><div><span class="text-sm font-medium text-gray-600">KPIs:</span><ul class="text-sm text-gray-700 mt-1 space-y-1">${phase.metrics.map(m => `<li class="text-xs">• ${m}</li>`).join('')}</ul></div></div></div></div></div>`;
    });
    planHTML += `</div>`;
    container.innerHTML = planHTML;
}

function cancelProcess() {
    if (confirm('¿Está seguro que desea cancelar? Se perderán todos los datos ingresados.')) {
        window.location.reload();
    }
}

function exportPlan() {
    if (!generatedPlan) { alert('No hay plan generado para exportar'); return; }
    const exportConfig = parameters.export;
    const planData = { company: companyData, plan: generatedPlan, configuration: { matricesVersion: "2.8", parametersVersion: "2.8", generatedAt: new Date().toISOString() } };
    const blob = new Blob([JSON.stringify(planData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportConfig.fileNamePrefix}${companyData.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}