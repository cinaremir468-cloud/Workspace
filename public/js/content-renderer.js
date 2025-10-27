// Ultra Enhanced Content Renderer - Chart, Form, Link Support

export { 
    renderContent,
    createContentCard,
    getTypeConfig,
    initMermaidDiagrams,
    initCharts,
    injectContentStyles,
    copyToClipboard
};

const TYPE_CONFIG = {
    note: { icon: '📝', label: 'Not', color: '#f59e0b' },
    table: { icon: '📊', label: 'Tablo', color: '#06b6d4' },
    list: { icon: '✅', label: 'Liste', color: '#10b981' },
    diagram: { icon: '🔄', label: 'Diyagram', color: '#8b5cf6' },
    link: { icon: '🔗', label: 'Link Koleksiyonu', color: '#ec4899' },
    chart: { icon: '📈', label: 'Grafik', color: '#3b82f6' },
    form: { icon: '📋', label: 'Form/Anket', color: '#f43f5e' },
    auto: { icon: '🤖', label: 'Otomatik', color: '#667eea' }
};

const chartInstances = new Map();

function initMermaid() {
    if (typeof mermaid === 'undefined') {
        console.error('Mermaid library not loaded');
        return;
    }

    mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
            primaryColor: '#667eea',
            primaryTextColor: '#1a1a1a',
            primaryBorderColor: '#5568d3',
            lineColor: '#6b7280',
            secondaryColor: '#764ba2',
            tertiaryColor: '#f7f9fc',
            fontSize: '16px',
            fontFamily: 'Inter, sans-serif'
        },
        flowchart: {
            htmlLabels: true,
            curve: 'basis',
            padding: 15,
            nodeSpacing: 50,
            rankSpacing: 50
        },
        securityLevel: 'loose',
        logLevel: 'error'
    });
}

function renderContent(content, type, contentId = null) {
    switch (type) {
        case 'note':
            return renderNote(content);
        case 'table':
            return renderTable(content);
        case 'list':
            return renderList(content, contentId);
        case 'diagram':
            return renderDiagram(content);
        case 'link':
            return renderLink(content);
        case 'chart':
            return renderChart(content, contentId);
        case 'form':
            return renderForm(content);
        default:
            return renderNote(content);
    }
}

function renderNote(content) {
    const cleaned = content.replace(/```.*?\n/g, '').replace(/```/g, '');
    return `<div class="note-content">${escapeHtml(cleaned)}</div>`;
}

function renderTable(content) {
    try {
        const lines = content.split('\n').filter(line => line.trim());
        let html = '<table class="content-table">';
        
        lines.forEach((line, index) => {
            if (line.includes('---')) return;
            
            const cells = line.split('|').filter(cell => cell.trim());
            const tag = index === 0 ? 'th' : 'td';
            
            html += '<tr>';
            cells.forEach(cell => {
                html += `<${tag}>${escapeHtml(cell.trim())}</${tag}>`;
            });
            html += '</tr>';
        });
        
        html += '</table>';
        return html;
    } catch (error) {
        console.error('Table render error:', error);
        return renderNote(content);
    }
}

function renderList(content, contentId) {
    try {
        const lines = content.split('\n').filter(line => line.trim());
        let html = '<ul class="todo-list">';
        
        lines.forEach((line, index) => {
            const checked = line.includes('[x]') || line.includes('[X]');
            const text = line.replace(/^-?\s*\[(x|X| )\]\s*/i, '').trim();
            
            if (text) {
                html += `
                    <li class="todo-item">
                        <input 
                            type="checkbox" 
                            ${checked ? 'checked' : ''} 
                            data-content-id="${contentId || ''}"
                            data-item-index="${index}"
                            onchange="window.handleCheckboxChange(this)">
                        <span>${escapeHtml(text)}</span>
                    </li>
                `;
            }
        });
        
        html += '</ul>';
        return html;
    } catch (error) {
        console.error('List render error:', error);
        return renderNote(content);
    }
}

function renderDiagram(content) {
    try {
        let mermaidCode = cleanMermaidCode(content);
        
        if (!isValidMermaidSyntax(mermaidCode)) {
            return renderDiagramError(mermaidCode);
        }

        const uniqueId = 'mermaid-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        return `
            <div class="mermaid-container" data-zoom="1">
                <div class="mermaid-controls">
                    <button class="mermaid-control-btn zoom-in" title="Yakınlaştır">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                            <line x1="8" y1="11" x2="14" y2="11"></line>
                            <line x1="11" y1="8" x2="11" y2="14"></line>
                        </svg>
                    </button>
                    <button class="mermaid-control-btn zoom-out" title="Uzaklaştır">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                            <line x1="8" y1="11" x2="14" y2="11"></line>
                        </svg>
                    </button>
                    <button class="mermaid-control-btn zoom-reset" title="Sıfırla">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                            <path d="M21 3v5h-5"></path>
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                            <path d="M3 21v-5h5"></path>
                        </svg>
                    </button>
                </div>
                <div class="mermaid-diagram-wrapper">
                    <div class="mermaid-diagram" id="${uniqueId}">${mermaidCode}</div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Diagram render error:', error);
        return renderDiagramError(content);
    }
}

function renderLink(content) {
    try {
        const data = JSON.parse(content);
        let html = '<div class="link-collection">';
        
        if (data.links && Array.isArray(data.links)) {
            data.links.forEach(link => {
                html += `
                    <div class="link-item">
                        <div class="link-title">
                            🔗 ${escapeHtml(link.title || 'Link')}
                        </div>
                        <div class="link-url">
                            <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
                                ${escapeHtml(link.url)}
                            </a>
                        </div>
                        ${link.description ? `<div class="link-description">${escapeHtml(link.description)}</div>` : ''}
                    </div>
                `;
            });
        }
        
        html += '</div>';
        return html;
    } catch (error) {
        console.error('Link render error:', error);
        return renderNote(content);
    }
}

function renderChart(content, contentId) {
    try {
        const data = JSON.parse(content);
        const chartId = 'chart-' + (contentId || Date.now());
        
        return `
            <div class="chart-container">
                <div class="chart-title">${escapeHtml(data.title || 'Grafik')}</div>
                <div class="chart-wrapper">
                    <canvas id="${chartId}" data-chart-config='${escapeHtml(JSON.stringify(data))}'></canvas>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Chart render error:', error);
        return renderNote(content);
    }
}

function renderForm(content) {
    try {
        const data = JSON.parse(content);
        let html = `<div class="form-container">`;
        
        if (data.title) {
            html += `<h3 class="form-title">${escapeHtml(data.title)}</h3>`;
        }
        
        html += `<form class="survey-form" onsubmit="return false;">`;
        
        if (data.fields && Array.isArray(data.fields)) {
            data.fields.forEach((field, index) => {
                html += `<div class="form-field">`;
                html += `<label class="form-label">${escapeHtml(field.label || 'Alan')}${field.required ? ' *' : ''}</label>`;
                
                switch (field.type) {
                    case 'text':
                    case 'email':
                    case 'number':
                        html += `<input type="${field.type}" class="form-input" placeholder="${escapeHtml(field.placeholder || '')}" ${field.required ? 'required' : ''}>`;
                        break;
                    
                    case 'textarea':
                        html += `<textarea class="form-textarea" rows="${field.rows || 4}" placeholder="${escapeHtml(field.placeholder || '')}" ${field.required ? 'required' : ''}></textarea>`;
                        break;
                    
                    case 'select':
                        html += `<select class="form-select" ${field.required ? 'required' : ''}>`;
                        html += `<option value="">Seçiniz...</option>`;
                        (field.options || []).forEach(opt => {
                            html += `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`;
                        });
                        html += `</select>`;
                        break;
                    
                    case 'radio':
                        html += `<div class="form-radio-group">`;
                        (field.options || []).forEach(opt => {
                            html += `
                                <label class="form-radio-item">
                                    <input type="radio" name="field-${index}" value="${escapeHtml(opt)}" ${field.required ? 'required' : ''}>
                                    ${escapeHtml(opt)}
                                </label>
                            `;
                        });
                        html += `</div>`;
                        break;
                    
                    case 'checkbox':
                        html += `<div class="form-checkbox-group">`;
                        (field.options || []).forEach(opt => {
                            html += `
                                <label class="form-checkbox-item">
                                    <input type="checkbox" value="${escapeHtml(opt)}">
                                    ${escapeHtml(opt)}
                                </label>
                            `;
                        });
                        html += `</div>`;
                        break;
                }
                
                html += `</div>`;
            });
        }
        
        html += `<button type="submit" class="form-submit">Gönder</button>`;
        html += `</form></div>`;
        
        return html;
    } catch (error) {
        console.error('Form render error:', error);
        return renderNote(content);
    }
}

function renderDiagramError(content) {
    return `
        <div class="diagram-error">
            <p>⚠️ Diyagram oluşturulamadı</p>
            <pre>${escapeHtml(content)}</pre>
        </div>
    `;
}

function cleanMermaidCode(content) {
    let cleaned = content.trim();
    
    if (cleaned.includes('```mermaid')) {
        const match = cleaned.match(/```mermaid\s*([\s\S]*?)```/);
        if (match) cleaned = match[1].trim();
    } else if (cleaned.includes('```')) {
        const match = cleaned.match(/```\s*([\s\S]*?)```/);
        if (match) cleaned = match[1].trim();
    }
    
    cleaned = cleaned
        .replace(/ü/gi, 'u')
        .replace(/ö/gi, 'o')
        .replace(/ş/gi, 's')
        .replace(/ı/gi, 'i')
        .replace(/ğ/gi, 'g')
        .replace(/ç/gi, 'c')
        .replace(/İ/g, 'I');
    
    return cleaned.trim();
}

function isValidMermaidSyntax(code) {
    const validTypes = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'journey'];
    const firstLine = code.trim().split('\n')[0].toLowerCase();
    return validTypes.some(type => firstLine.includes(type.toLowerCase()));
}

function createContentCard(contentData) {
    const config = TYPE_CONFIG[contentData.type] || TYPE_CONFIG.auto;
    const date = contentData.createdAt ? new Date(contentData.createdAt.seconds * 1000) : new Date();
    
    const card = document.createElement('div');
    card.className = 'content-card';
    card.dataset.type = contentData.type;
    card.dataset.id = contentData.id;
    
    const preview = createPreview(contentData.content, contentData.type);
    
    card.innerHTML = `
        <div class="content-card-actions">
            <button class="card-action-btn copy-card" title="Kopyala">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            </button>
        </div>
        <div class="content-type-badge" style="background: ${config.color}20; color: ${config.color};">
            <span>${config.icon}</span>
            <span>${config.label}</span>
        </div>
        <div class="content-preview">
            ${preview}
        </div>
        <div class="content-date">${formatDate(date)}</div>
    `;
    
    const copyBtn = card.querySelector('.copy-card');
    copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(contentData.content);
    });
    
    return card;
}

function createPreview(content, type) {
    const maxLength = 200;
    let preview = '';
    
    switch (type) {
        case 'table':
            preview = content.split('\n').slice(0, 3).join('\n');
            break;
        case 'list':
            preview = content.split('\n').slice(0, 5).join('\n');
            break;
        case 'link':
        case 'chart':
        case 'form':
            try {
                const data = JSON.parse(content);
                preview = JSON.stringify(data, null, 2).substring(0, maxLength);
            } catch {
                preview = content.substring(0, maxLength);
            }
            break;
        default:
            preview = content.substring(0, maxLength);
            if (content.length > maxLength) preview += '...';
    }
    
    return renderContent(preview, type);
}

function getTypeConfig(type) {
    return TYPE_CONFIG[type] || TYPE_CONFIG.auto;
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Az önce';
    if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return `${mins} dakika önce`;
    }
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} saat önce`;
    }
    
    return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Kopyalandı!', 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        showToast('Kopyalama başarısız', 'error');
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function initMermaidDiagrams() {
    initMermaid();
    
    setTimeout(() => {
        const diagrams = document.querySelectorAll('.mermaid-diagram');
        
        diagrams.forEach(async (diagram) => {
            if (diagram.dataset.rendered) return;
            
            try {
                const code = diagram.textContent.trim();
                const { svg } = await mermaid.render(diagram.id + '-svg', code);
                diagram.innerHTML = svg;
                diagram.dataset.rendered = 'true';
                
                addZoomControls(diagram.closest('.mermaid-container'));
            } catch (error) {
                console.error('Mermaid render error:', error);
                diagram.innerHTML = renderDiagramError(diagram.textContent);
            }
        });
    }, 100);
}

function initCharts() {
    setTimeout(() => {
        const canvases = document.querySelectorAll('canvas[data-chart-config]');
        
        canvases.forEach(canvas => {
            if (chartInstances.has(canvas.id)) {
                chartInstances.get(canvas.id).destroy();
            }
            
            try {
                const config = JSON.parse(canvas.dataset.chartConfig);
                const ctx = canvas.getContext('2d');
                
                const chart = new Chart(ctx, {
                    type: config.type || 'bar',
                    data: {
                        labels: config.labels || [],
                        datasets: config.datasets || []
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top',
                            },
                            title: {
                                display: false
                            }
                        }
                    }
                });
                
                chartInstances.set(canvas.id, chart);
            } catch (error) {
                console.error('Chart init error:', error);
            }
        });
    }, 100);
}

function addZoomControls(container) {
    if (!container) return;
    
    const wrapper = container.querySelector('.mermaid-diagram-wrapper');
    const zoomInBtn = container.querySelector('.zoom-in');
    const zoomOutBtn = container.querySelector('.zoom-out');
    const zoomResetBtn = container.querySelector('.zoom-reset');
    
    let currentZoom = 1;
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentZoom = Math.min(currentZoom + 0.2, 3);
            updateZoom();
        });
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentZoom = Math.max(currentZoom - 0.2, 0.5);
            updateZoom();
        });
    }
    
    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentZoom = 1;
            updateZoom();
        });
    }
    
    function updateZoom() {
        if (wrapper) {
            wrapper.style.transform = `scale(${currentZoom})`;
            container.dataset.zoom = currentZoom;
        }
    }
}

function injectContentStyles() {
    if (document.getElementById('content-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'content-styles';
    style.textContent = `
        .link-description {
            font-size: 13px;
            color: var(--text-secondary);
            margin-top: 4px;
        }
    `;
    
    document.head.appendChild(style);
}

console.log('✅ Ultra Enhanced Content Renderer loaded (Chart, Form, Link)');
