// js/motor-evaluador.js
// ===================================================================
// MOTOR DE EVALUACIÓN Y CÁLCULO NIST CSF 2.0
// Este archivo contiene toda la lógica de negocio para generar perfiles y planes.
// No interactúa directamente con el DOM (la página HTML).
// ===================================================================

function calculateGovernLevel(governance, technicalCapabilities, functionLimits) {
    let level = 1; // Nivel base
    if (governance.cybersecurityOwner === 'ti_interno' || governance.cybersecurityOwner === 'gerente_general') { level += 1; }
    if (governance.riskIntegration === 'formal_process') { level += 1; }
    switch (technicalCapabilities.employeeTraining) {
        case 'informacion_leer': case 'charla': level += 1; break;
        case 'curso_dias': case 'requisito_contratacion': level += 2; break;
    }
    return Math.min(functionLimits.max, Math.max(functionLimits.min, level));
}

function calculateIdentifyLevel(technicalCapabilities, functionLimits) {
    let level = 1;
    switch (technicalCapabilities.assetInventory) {
        case 'lista_basica': level += 1; break;
        case 'inventario_digital': level += 2; break;
        case 'inventario_automatizado': level += 3; break;
    }
    return Math.min(functionLimits.max, Math.max(functionLimits.min, level));
}

function calculateProtectLevel(technicalCapabilities, functionLimits) {
    let level = 1;
    switch (technicalCapabilities.protectionSystems) {
        case 'antivirus': level += 1; break;
        case 'antivirus_firewall': level += 2; break;
        case 'completo': level += 3; break;
    }
    switch (technicalCapabilities.passwordPolicy) {
        case 'servidor_obliga': level += 1; break;
        case 'politica_formal': level += 2; break;
    }
    return Math.min(functionLimits.max, Math.max(functionLimits.min, level));
}

function calculateDetectLevel(technicalCapacity, technicalCapabilities, functionLimits) {
    let level = 1;
    if (technicalCapacity === 'avanzada') { level += 1; }
    if (technicalCapacity === 'ninguna') { level -= 1; }
    switch (technicalCapabilities.protectionSystems) {
        case 'antivirus': level += 1; break;
        case 'antivirus_firewall': case 'completo': level += 2; break;
    }
    switch (technicalCapabilities.assetInventory) {
        case 'lista_basica': case 'inventario_digital': level += 1; break;
        case 'inventario_automatizado': level += 2; break;
    }
    switch (technicalCapabilities.employeeTraining) {
        case 'charla': case 'informacion_leer': case 'curso_dias': case 'requisito_contratacion': level += 1; break;
    }
    return Math.min(functionLimits.max, Math.max(functionLimits.min, level));
}

function calculateRespondLevel(technicalCapabilities, functionLimits) {
    let level = 1;
    switch (technicalCapabilities.incidentPlan) {
        case 'sabemos_llamar': level += 1; break;
        case 'plan_basico': level += 2; break;
        case 'plan_detallado': level += 3; break;
    }
    switch (technicalCapabilities.criticalDecisions) {
        case 'solo_gerente': level += 1; break;
        case 'gerente_ti': level += 2; break;
        case 'equipo_definido': level += 3; break;
    }
    return Math.min(functionLimits.max, Math.max(functionLimits.min, level));
}

function calculateRecoverLevel(technicalCapabilities, functionLimits) {
    let level = 1;
    switch (technicalCapabilities.backupFrequency) {
        case 'mensual': level += 1; break;
        case 'semanal': level += 2; break;
        case 'diario': level += 3; break;
    }
    return Math.min(functionLimits.max, Math.max(functionLimits.min, level));
}

function generateCurrentProfile(companyData, matrices) {
    const profile = {
        'GOVERN': calculateGovernLevel(companyData.governance, companyData.technicalCapabilities, matrices.functionLimits.GOVERN),
        'IDENTIFY': calculateIdentifyLevel(companyData.technicalCapabilities, matrices.functionLimits.IDENTIFY),
        'PROTECT': calculateProtectLevel(companyData.technicalCapabilities, matrices.functionLimits.PROTECT),
        'DETECT': calculateDetectLevel(companyData.technicalCapacity, companyData.technicalCapabilities, matrices.functionLimits.DETECT),
        'RESPOND': calculateRespondLevel(companyData.technicalCapabilities, matrices.functionLimits.RESPOND),
        'RECOVER': calculateRecoverLevel(companyData.technicalCapabilities, matrices.functionLimits.RECOVER)
    };
    return profile;
}

function generateTargetProfile(companyData, currentProfile, matrices, parameters) {
    const employeeCount = parseInt(companyData.employees.split('-')[0] || '1');
    const targetParams = parameters.profileCalculation.targetProfile;
    let baseTargets;
    if (employeeCount <= 10) baseTargets = {...targetParams.employeeBases["1-10"]};
    else if (employeeCount <= 25) baseTargets = {...targetParams.employeeBases["11-25"]};
    else baseTargets = {...targetParams.employeeBases["26-50"]};
    const siiClass = matrices.siiClassification[companyData.revenue];
    if (siiClass) {
        Object.keys(baseTargets).forEach(func => { baseTargets[func] = Math.round(baseTargets[func] * siiClass.baseMultiplier); });
        siiClass.prioritizeFunctions.forEach(func => { if (baseTargets[func]) baseTargets[func] += 1; });
    }
    baseTargets.GOVERN += targetParams.governancePriorityBonus;
    const sectorReqs = matrices.sectorSpecificRequirements[companyData.sector] || {};
    const multipliers = sectorReqs.functionPriorities || {};
    Object.keys(baseTargets).forEach(func => {
        const multiplier = multipliers[func] || 1;
        baseTargets[func] = Math.ceil(baseTargets[func] * multiplier);
    });
    targetParams.complexFunctions.forEach(func => { if (companyData.technicalCapacity !== 'avanzada') { baseTargets[func] += targetParams.complexFunctionPenalty; } });
    if (companyData.timeline === '3') {
        const priorityToFunctionMap = { "Protección de datos de clientes": ["PROTECT", "IDENTIFY"], "Continuidad del negocio": ["RECOVER", "RESPOND"], "Cumplimiento regulatorio": ["GOVERN"], "Protección de propiedad intelectual": ["PROTECT", "IDENTIFY"], "Seguridad de pagos": ["PROTECT", "DETECT"] };
        companyData.priorities.forEach(priority => { const functionsToBoost = priorityToFunctionMap[priority]; if (functionsToBoost) { functionsToBoost.forEach(func => { baseTargets[func] += 1; }); } });
    }
    Object.keys(baseTargets).forEach(func => { const limits = matrices.functionLimits[func]; if (limits) { baseTargets[func] = Math.min(limits.max, Math.max(limits.min, baseTargets[func])); } });
    if (currentProfile) {
        Object.keys(baseTargets).forEach(func => {
            const currentLevel = currentProfile[func] || 0;
            if (baseTargets[func] < currentLevel) { baseTargets[func] = currentLevel; }
            const limits = matrices.functionLimits[func];
            if (limits) { baseTargets[func] = Math.min(limits.max, baseTargets[func]); }
        });
    }
    return baseTargets;
}

function generateAdvancedPlan(currentProfile, targetProfile, companyData, matrices, parameters) {
    if (!currentProfile || !targetProfile) { return null; }
    const phases = generatePhases(currentProfile, targetProfile, companyData, matrices, parameters);
    return {
        currentProfile, targetProfile, phases,
        timeline: calculateTotalTimeline(phases),
        riskReduction: calculateRiskReduction(phases, companyData, matrices, parameters),
        complianceAlignment: calculateComplianceAlignment(companyData, matrices, parameters)
    };
}

function generatePhases(currentProfile, targetProfile, companyData, matrices, parameters) {
    const phases = [];
    const phaseConfig = parameters.phaseConstruction;
    const governPhase = { name: 'Fase 1: Establecimiento de Gobernanza', functions: [phaseConfig.phase1Function], subcategories: selectRelevantSubcategories(phaseConfig.phase1Function, currentProfile.GOVERN, targetProfile.GOVERN, companyData, matrices, parameters), priority: 'CRÍTICO' };
    governPhase.timeline = calculatePhaseTimeline(governPhase.subcategories, 0, companyData, matrices, parameters);
    governPhase.metrics = generatePhaseMetrics(governPhase.functions, matrices);
    phases.push(governPhase);
    const functionsByGap = Object.entries(targetProfile)
        .filter(([func]) => func !== phaseConfig.phase1Function)
        .map(([func, targetLevel]) => ({ function: func, gap: targetLevel - currentProfile[func], targetLevel, currentLevel: currentProfile[func] }))
        .sort((a, b) => b.gap - a.gap)
        .filter(funcData => phaseConfig.onlyPositiveGaps ? funcData.gap > 0 : true)
        .slice(0, phaseConfig.maxAdditionalPhases);
    functionsByGap.forEach((funcData, index) => {
        const phase = { name: `Fase ${index + 2}: ${matrices.functionNames[funcData.function] || funcData.function}`, functions: [funcData.function], subcategories: selectRelevantSubcategories(funcData.function, funcData.currentLevel, funcData.targetLevel, companyData, matrices, parameters), priority: funcData.gap > 2 ? 'CRÍTICO' : funcData.gap > 1 ? 'ALTO' : 'MEDIO' };
        phase.timeline = calculatePhaseTimeline(phase.subcategories, index + 1, companyData, matrices, parameters);
        phase.metrics = generatePhaseMetrics(phase.functions, matrices);
        phases.push(phase);
    });
    return phases;
}

function selectRelevantSubcategories(functionName, currentLevel, targetLevel, companyData, matrices, parameters) {
    const functionSubcategories = Object.keys(matrices.nistSubcategories).filter(key => {
        const prefix = key.split('.')[0];
        return (functionName === 'GOVERN' && prefix === 'GV') || (functionName === 'IDENTIFY' && prefix === 'ID') || (functionName === 'PROTECT' && prefix === 'PR') || (functionName === 'DETECT' && prefix === 'DE') || (functionName === 'RESPOND' && prefix === 'RS') || (functionName === 'RECOVER' && prefix === 'RC');
    });
    const scoredSubcategories = functionSubcategories.map(subcat => ({ id: subcat, score: calculateSubcategoryRelevance(subcat, { ...companyData, currentLevel, targetLevel }, matrices, parameters) }));
    const maxSubcategories = parameters.subcategorySelection.maxSubcategoriesPerFunction;
    const numberOfSubcategories = Math.min(maxSubcategories, Math.max(parameters.ui.minSubcategoriesPerPhase, targetLevel - currentLevel + 1));
    const selected = scoredSubcategories
        .sort((a, b) => b.score - a.score)
        .slice(0, numberOfSubcategories)
        .map(item => ({
            id: item.id,
            name: matrices.nistSubcategories[item.id].name,
            activity: matrices.nistSubcategories[item.id].activities[targetLevel <= 2 ? 'basic' : targetLevel <= 3 ? 'intermediate' : 'advanced'],
            priority: item.score >= parameters.scoring.priorityThresholds.critical ? 'CRÍTICO' : item.score >= parameters.scoring.priorityThresholds.high ? 'ALTO' : 'MEDIO',
            currentImplementation: matrices.implementationMap[currentLevel.toString()] || 'No implementado',
            complexity: matrices.nistSubcategories[item.id].implementationComplexity,
            score: item.score,
            complianceInfo: getComplianceInfo(item.id, companyData, matrices),
            dependencyInfo: getDependencyInfo(item.id, matrices),
            riskReduction: calculateSpecificRiskReduction(item.id, companyData.sector, matrices)
        }));
    return sortSubcategoriesByDependencies(selected, matrices);
}

function getDependencyInfo(subcategoryId, matrices) {
    const dependency = matrices.dependencyMatrix[subcategoryId];
    if (!dependency) return null;
    return { dependencies: dependency.dependencies, description: dependency.description, requiresFirst: dependency.dependencies.map(dep => matrices.nistSubcategories[dep]?.name || dep) };
}

function getComplianceInfo(subcategoryId, companyData, matrices) {
    const compliance = matrices.complianceMatrix[subcategoryId];
    if (!compliance) return [];
    const applicableRegulations = [];
    Object.entries(compliance).forEach(([regulation, config]) => {
        let applies = false;
        let regulationName = '';
        switch (regulation) {
            case 'ley19628': applies = companyData.riskProfile.dataTypes.includes('Datos personales de clientes'); regulationName = '🇨🇱 Ley 19.628'; break;
            case 'pciDSS': applies = companyData.sector === 'Retail/Comercio' && companyData.riskProfile.dataTypes.includes('Información financiera'); regulationName = '💳 PCI-DSS'; break;
            case 'gdpr': applies = companyData.riskProfile.dataTypes.includes('Datos personales de clientes') && Math.random() > 0.8; regulationName = '🇪🇺 GDPR'; break;
            case 'iso27001': applies = true; regulationName = '📊 ISO 27001'; break;
            case 'sectoral': applies = checkSectoralApplicability(config.condition, companyData.sector); regulationName = `🏭 ${config.description}`; break;
        }
        if (applies) { applicableRegulations.push({ name: regulationName, level: config.level, bonus: config.bonus, description: config.description || '' }); }
    });
    return applicableRegulations;
}

function checkSectoralApplicability(condition, sector) {
    switch (condition) {
        case 'retail': return sector === 'Retail/Comercio';
        case 'servicios': return sector === 'Servicios Profesionales';
        case 'manufactura': return sector === 'Manufactura/Industria';
        case 'tecnologia': return sector === 'Tecnología/Software';
        case 'always': return true;
        default: return false;
    }
}

function calculateSubcategoryRelevance(subcategoryId, context, matrices, parameters) {
    const matrix = matrices.subcategoryMatrix[subcategoryId];
    if (!matrix) return parameters.scoring.subcategoryScoring.baseScore;
    let score = matrix.base;
    score += matrix.mandatoryBySector[context.sector] || 0;
    let priorityBonus = 0;
    context.priorities.forEach(priority => { if (matrix.priorityAlignments[priority]) { priorityBonus = Math.max(priorityBonus, matrix.priorityAlignments[priority]); } });
    score += priorityBonus;
    const gap = Math.max(0, context.targetLevel - context.currentLevel);
    const gapFactors = parameters.scoring.gapFactors;
    if (gap === 1) score += gapFactors.gap1;
    else if (gap === 2) score += gapFactors.gap2;
    else if (gap >= 3) score += gapFactors.gap3Plus;
    const functionName = getFunctionFromSubcategory(subcategoryId);
    const sectorReqs = matrices.sectorSpecificRequirements[context.sector] || {};
    const functionPriority = sectorReqs.functionPriorities?.[functionName] || 0.5;
    if (functionPriority > parameters.sectorPriorityThreshold) { score += parameters.scoring.subcategoryScoring.sectorPriorityBonus; }
    score += calculateComplianceBonus(subcategoryId, context, matrices);
    return Math.min(parameters.scoring.subcategoryScoring.maxScore, score);
}

function getFunctionFromSubcategory(subcategoryId) {
    const prefix = subcategoryId.split('.')[0];
    if (prefix === 'GV') return 'GOVERN';
    if (prefix === 'ID') return 'IDENTIFY';
    if (prefix === 'PR') return 'PROTECT';
    if (prefix === 'DE') return 'DETECT';
    if (prefix === 'RS') return 'RESPOND';
    if (prefix === 'RC') return 'RECOVER';
    return 'UNKNOWN';
}

function calculateComplianceBonus(subcategoryId, companyData, matrices) {
    const compliance = matrices.complianceMatrix[subcategoryId];
    if (!compliance) return 0;
    let totalBonus = 0;
    Object.entries(compliance).forEach(([regulation, config]) => {
        let applies = false;
        switch (config.condition) {
            case "personalData": applies = companyData.riskProfile.dataTypes.includes('Datos personales de clientes'); break;
            case "retailPayments": applies = companyData.sector === 'Retail/Comercio' && companyData.riskProfile.dataTypes.includes('Información financiera'); break;
            case "euOperations": applies = companyData.riskProfile.dataTypes.includes('Datos personales de clientes') && Math.random() > 0.8; break;
            case "always": applies = true; break;
            default: applies = checkSectoralApplicability(config.condition, companyData.sector); break;
        }
        if (applies) { totalBonus += config.bonus; }
    });
    return totalBonus;
}

function calculatePhaseTimeline(subcategories, phaseIndex, companyData, matrices, parameters) {
    if (subcategories.length === 0) return "0-0 meses";
    const timelineConfig = parameters.timeline;
    let adjustedMonths = timelineConfig.baseMonths;
    adjustedMonths *= matrices.capacityMultipliers[companyData.technicalCapacity] || 1.0;
    adjustedMonths *= matrices.staffMultipliers[companyData.staffAvailability] || 1.0;
    if (companyData.outsourcingWillingness !== 'reluctant') { adjustedMonths *= timelineConfig.outsourcingSpeedupFactor; }
    const complexityFactor = subcategories.reduce((acc, sub) => acc + (timelineConfig.complexityWeights[sub.complexity] || 1.0), 0) / subcategories.length;
    adjustedMonths *= complexityFactor;
    const startMonth = Math.round(phaseIndex * adjustedMonths * timelineConfig.phaseStartFactor);
    const endMonth = startMonth + Math.round(adjustedMonths);
    return `${startMonth}-${endMonth} meses`;
}

function generatePhaseMetrics(functions, matrices) {
    const metrics = [];
    functions.forEach(func => { if (matrices.functionMetrics[func]) { metrics.push(...matrices.functionMetrics[func].slice(0, 2)); } });
    return metrics.slice(0, 3);
}

function calculateTotalTimeline(phases) {
    if (!phases.length) return '0 meses';
    const maxEndMonth = Math.max(...phases.map(phase => parseInt(phase.timeline.split('-')[1]) || 0));
    return `${maxEndMonth} meses`;
}

function checkDependencies(subcategoryId, implementedSubcategories, matrices) {
    const dependencies = matrices.dependencyMatrix[subcategoryId];
    if (!dependencies) return true;
    return dependencies.dependencies.every(dep => implementedSubcategories.includes(dep));
}

function sortSubcategoriesByDependencies(subcategories, matrices) {
    const sorted = [];
    const remaining = [...subcategories];
    let maxIterations = subcategories.length * 2;
    while (remaining.length > 0 && maxIterations > 0) {
        const initialLength = remaining.length;
        for (let i = remaining.length - 1; i >= 0; i--) {
            const subcat = remaining[i];
            const implementedIds = sorted.map(s => s.id);
            if (checkDependencies(subcat.id, implementedIds, matrices)) {
                sorted.push(subcat);
                remaining.splice(i, 1);
            }
        }
        if (remaining.length === initialLength) { return sorted.concat(remaining); }
        maxIterations--;
    }
    return sorted;
}

function calculateSpecificRiskReduction(subcategoryId, sector, matrices) {
    const riskData = matrices.riskReductionMatrix[subcategoryId];
    if (!riskData) return 0;
    let totalReduction = riskData.baseReduction;
    if (riskData.sectorCritical && riskData.sectorCritical[sector]) { totalReduction += riskData.sectorCritical[sector]; }
    return Math.min(100, totalReduction);
}

function calculateRiskReduction(phases, companyData, matrices, parameters) {
    let totalWeightedReduction = 0;
    let totalWeights = 0;
    phases.forEach(phase => { phase.subcategories.forEach(subcat => { const weight = subcat.score || 0.5; totalWeightedReduction += subcat.riskReduction * weight; totalWeights += weight; }); });
    if (totalWeights === 0) return parameters.riskCalculation.riskReductionFormula.minReduction;
    const averageReduction = totalWeightedReduction / totalWeights;
    const riskConfig = parameters.riskCalculation.riskReductionFormula;
    return Math.min(riskConfig.maxReduction, Math.max(riskConfig.minReduction, Math.round(averageReduction)));
}

function calculateComplianceAlignment(companyData, matrices, parameters) {
    const sectorReqs = matrices.sectorSpecificRequirements[companyData.sector] || {};
    const mandatoryCount = sectorReqs.mandatorySubcategories?.length || 0;
    if (mandatoryCount === 0) return 'Básico';
    const implementedCount = Math.min(mandatoryCount, companyData.priorities.length + 1);
    const compliancePercentage = implementedCount / mandatoryCount;
    const thresholds = parameters.riskCalculation.complianceThresholds;
    if (compliancePercentage >= thresholds.high) return 'Alto';
    if (compliancePercentage >= thresholds.mediumHigh) return 'Medio-Alto';
    if (compliancePercentage >= thresholds.medium) return 'Medio';
    return 'Básico';
}