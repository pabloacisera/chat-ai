/**
 * Test runner para StreamEffect (sin DOM real)
 * Ejecutar: cd packages/api-express && npx ts-node --transpile-only ../../test-stream-node.ts
 */

// Simular DOM mínimo para testing
const mockElements = new Map();
let elementCounter = 0;

const createMockElement = (tagName) => {
    const id = `mock-${elementCounter++}`;
    let innerHTML = '';
    let textContent = '';
    
    const mock = {
        id,
        tagName: tagName.toUpperCase(),
        _children: [],
        get innerHTML() { return innerHTML; },
        set innerHTML(v) { innerHTML = v; },
        get textContent() { return textContent; },
        set textContent(v) { textContent = v; },
        appendChild(child) {
            this._children.push(child);
            if (child.innerHTML !== undefined) {
                innerHTML += child.innerHTML;
            } else if (child.textContent !== undefined) {
                textContent += child.textContent;
                innerHTML += child.textContent;
            }
            return child;
        },
        scrollIntoView: () => {},
        scrollTop: 0,
        scrollHeight: 500
    };
    
    mockElements.set(id, mock);
    return mock;
};

global.document = {
    createElement: (tag) => createMockElement(tag),
    createTextNode: (text) => ({ textContent: text, nodeType: 3 }),
    createTreeWalker: () => ({ nextNode: () => null })
};

global.NodeFilter = { SHOW_TEXT: 1 };
global.Node = { TEXT_NODE: 3 };

// Importar el módulo
import('./public/js/helpers/streamData.js').then(async ({ StreamEffect }) => {
    console.log('=== TEST StreamEffect ===\n');
    
    const tests = [
        {
            name: 'Test 1: Texto plano simple',
            input: 'Hola mundo',
            expectHTML: false
        },
        {
            name: 'Test 2: Solo texto con ** ( Markdown)',
            input: 'Texto con **negritas**',
            expectHTML: true  // La API convierte a HTML
        },
        {
            name: 'Test 3: HTML con tags simples',
            input: '<p>Hola mundo</p>',
            expectHTML: true
        },
        {
            name: 'Test 4: HTML con negritas',
            input: '<p>Hola <strong>mundo</strong></p>',
            expectHTML: true
        },
        {
            name: 'Test 5: Lista HTML',
            input: '<ul><li>Item 1</li><li>Item 2</li></ul>',
            expectHTML: true
        },
        {
            name: 'Test 6: HTML mixto con br',
            input: '<p>Línea 1<br>Línea 2</p>',
            expectHTML: true
        }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        console.log(`▶ ${test.name}`);
        
        const container = createMockElement('div');
        const scrollContainer = { scrollTop: 0, scrollHeight: 0, get scrollHeight() { return 500; }, set scrollTop(v) { this.scrollTop = v; } };
        
        const stream = new StreamEffect({ speed: 5 });
        
        try {
            await stream.write(test.input, container, { scrollContainer });
            
            const result = container.innerHTML;
            
            // Verificar: no debe contener tags literales como &lt; o <p> sin interpretar
            const hasLiteralTags = result.includes('&lt;') || result.includes('<p>');
            const hasCloseTagBeforeOpen = result.match(/<\/[^>]+>[^<]*<[a-z]/i);
            
            if (!hasLiteralTags && !hasCloseTagBeforeOpen) {
                console.log(`  ✓ Pass - Output: ${result.substring(0, 60)}...`);
                passed++;
            } else {
                console.log(`  ✗ Fail - Has literal tags: ${hasLiteralTags}`);
                failed++;
            }
        } catch (e) {
            if (e.message === 'Stream cancelled') {
                console.log(`  ✓ Pass - Cancelled correctly`);
                passed++;
            } else {
                console.log(`  ✗ Error: ${e.message}`);
                failed++;
            }
        }
    }
    
    console.log(`\n=== RESULTADO: ${passed}/${tests.length} passed, ${failed} failed ===`);
    process.exit(failed > 0 ? 1 : 0);
}).catch(e => {
    console.error('Error cargando módulo:', e.message);
    process.exit(1);
});