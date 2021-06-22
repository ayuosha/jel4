
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.38.2 */

    const { Object: Object_1, console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[34] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[34] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[34] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[34] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[34] = list[i];
    	return child_ctx;
    }

    // (113:13) {#each users as user}
    function create_each_block_4(ctx) {
    	let t0_value = /*user*/ ctx[34].id + "";
    	let t0;
    	let t1;
    	let br;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    			br = element("br");
    			add_location(br, file, 112, 45, 3234);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*users*/ 32768 && t0_value !== (t0_value = /*user*/ ctx[34].id + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(113:13) {#each users as user}",
    		ctx
    	});

    	return block;
    }

    // (114:13) {#each users as user}
    function create_each_block_3(ctx) {
    	let t0_value = /*user*/ ctx[34].firstname + "";
    	let t0;
    	let br;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			br = element("br");
    			t1 = space();
    			add_location(br, file, 113, 51, 3309);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*users*/ 32768 && t0_value !== (t0_value = /*user*/ ctx[34].firstname + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(114:13) {#each users as user}",
    		ctx
    	});

    	return block;
    }

    // (115:13) {#each users as user}
    function create_each_block_2(ctx) {
    	let t0_value = /*user*/ ctx[34].lastname + "";
    	let t0;
    	let t1;
    	let br;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    			br = element("br");
    			add_location(br, file, 114, 51, 3385);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*users*/ 32768 && t0_value !== (t0_value = /*user*/ ctx[34].lastname + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(115:13) {#each users as user}",
    		ctx
    	});

    	return block;
    }

    // (116:21) {#each users as user}
    function create_each_block_1(ctx) {
    	let t_value = /*user*/ ctx[34].email + "";
    	let t;
    	let br;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    			br = element("br");
    			add_location(br, file, 115, 54, 3463);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*users*/ 32768 && t_value !== (t_value = /*user*/ ctx[34].email + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(116:21) {#each users as user}",
    		ctx
    	});

    	return block;
    }

    // (117:13) {#each users as user}
    function create_each_block(ctx) {
    	let t_value = /*user*/ ctx[34].pwd + "";
    	let t;
    	let br;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    			br = element("br");
    			add_location(br, file, 116, 44, 3531);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*users*/ 32768 && t_value !== (t_value = /*user*/ ctx[34].pwd + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(117:13) {#each users as user}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let form0;
    	let h20;
    	let t1;
    	let input0;
    	let t2;
    	let input1_1;
    	let t3;
    	let input2_1;
    	let t4;
    	let input3_1;
    	let t5;
    	let input4_1;
    	let t6;
    	let br0;
    	let button0;
    	let t8;
    	let form1;
    	let h21;
    	let t10;
    	let input5_1;
    	let t11;
    	let input6_1;
    	let t12;
    	let input7_1;
    	let t13;
    	let input8_1;
    	let t14;
    	let input9_1;
    	let t15;
    	let br1;
    	let button1;
    	let t17;
    	let form2;
    	let h22;
    	let t19;
    	let input10_1;
    	let t20;
    	let input11_1;
    	let t21;
    	let input12_1;
    	let t22;
    	let input13_1;
    	let t23;
    	let input14_1;
    	let t24;
    	let br2;
    	let button2;
    	let t26;
    	let div;
    	let table;
    	let caption;
    	let t28;
    	let tr0;
    	let th0;
    	let th1;
    	let th2;
    	let th3;
    	let th4;
    	let t34;
    	let tr1;
    	let td0;
    	let span0;
    	let t35;
    	let td1;
    	let span1;
    	let t36;
    	let td2;
    	let span2;
    	let t37;
    	let td3;
    	let span3;
    	let t38;
    	let td4;
    	let span4;
    	let mounted;
    	let dispose;
    	let each_value_4 = /*users*/ ctx[15];
    	validate_each_argument(each_value_4);
    	let each_blocks_4 = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks_4[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	let each_value_3 = /*users*/ ctx[15];
    	validate_each_argument(each_value_3);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_3[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = /*users*/ ctx[15];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*users*/ ctx[15];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*users*/ ctx[15];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			form0 = element("form");
    			h20 = element("h2");
    			h20.textContent = "Заявка";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			input1_1 = element("input");
    			t3 = space();
    			input2_1 = element("input");
    			t4 = space();
    			input3_1 = element("input");
    			t5 = space();
    			input4_1 = element("input");
    			t6 = space();
    			br0 = element("br");
    			button0 = element("button");
    			button0.textContent = "Подтвердить";
    			t8 = space();
    			form1 = element("form");
    			h21 = element("h2");
    			h21.textContent = "Заявка на изменение";
    			t10 = space();
    			input5_1 = element("input");
    			t11 = space();
    			input6_1 = element("input");
    			t12 = space();
    			input7_1 = element("input");
    			t13 = space();
    			input8_1 = element("input");
    			t14 = space();
    			input9_1 = element("input");
    			t15 = space();
    			br1 = element("br");
    			button1 = element("button");
    			button1.textContent = "Подтвердить";
    			t17 = space();
    			form2 = element("form");
    			h22 = element("h2");
    			h22.textContent = "Заявка на удаление";
    			t19 = space();
    			input10_1 = element("input");
    			t20 = space();
    			input11_1 = element("input");
    			t21 = space();
    			input12_1 = element("input");
    			t22 = space();
    			input13_1 = element("input");
    			t23 = space();
    			input14_1 = element("input");
    			t24 = space();
    			br2 = element("br");
    			button2 = element("button");
    			button2.textContent = "Подтвердить";
    			t26 = space();
    			div = element("div");
    			table = element("table");
    			caption = element("caption");
    			caption.textContent = "Список заявок";
    			t28 = space();
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "ID";
    			th1 = element("th");
    			th1.textContent = "Имя";
    			th2 = element("th");
    			th2.textContent = "Фамилия";
    			th3 = element("th");
    			th3.textContent = "Электронная почта";
    			th4 = element("th");
    			th4.textContent = "Пароль";
    			t34 = space();
    			tr1 = element("tr");
    			td0 = element("td");
    			span0 = element("span");

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].c();
    			}

    			t35 = space();
    			td1 = element("td");
    			span1 = element("span");

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t36 = space();
    			td2 = element("td");
    			span2 = element("span");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t37 = space();
    			td3 = element("td");
    			span3 = element("span");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t38 = space();
    			td4 = element("td");
    			span4 = element("span");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(h20, file, 79, 2, 1532);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "placeholder", "Ваш ID");
    			attr_dev(input0, "class", "svelte-5iiivh");
    			add_location(input0, file, 80, 2, 1550);
    			attr_dev(input1_1, "type", "text");
    			attr_dev(input1_1, "placeholder", "Введите имя");
    			attr_dev(input1_1, "class", "svelte-5iiivh");
    			add_location(input1_1, file, 81, 2, 1615);
    			attr_dev(input2_1, "type", "text");
    			attr_dev(input2_1, "placeholder", "Введите фамилию");
    			attr_dev(input2_1, "class", "svelte-5iiivh");
    			add_location(input2_1, file, 82, 2, 1683);
    			attr_dev(input3_1, "type", "email");
    			attr_dev(input3_1, "placeholder", "Введите емейл");
    			attr_dev(input3_1, "class", "svelte-5iiivh");
    			add_location(input3_1, file, 83, 2, 1755);
    			attr_dev(input4_1, "placeholder", "Введите пароль");
    			attr_dev(input4_1, "type", "password");
    			attr_dev(input4_1, "class", "svelte-5iiivh");
    			add_location(input4_1, file, 84, 2, 1826);
    			add_location(br0, file, 85, 2, 1903);
    			attr_dev(button0, "class", "svelte-5iiivh");
    			add_location(button0, file, 85, 6, 1907);
    			attr_dev(form0, "class", "form1");
    			add_location(form0, file, 78, 1, 1474);
    			add_location(h21, file, 88, 2, 2005);
    			attr_dev(input5_1, "type", "number");
    			attr_dev(input5_1, "placeholder", "Ваш ID");
    			attr_dev(input5_1, "class", "svelte-5iiivh");
    			add_location(input5_1, file, 89, 2, 2036);
    			attr_dev(input6_1, "type", "text");
    			attr_dev(input6_1, "placeholder", "Введите имя");
    			attr_dev(input6_1, "class", "svelte-5iiivh");
    			add_location(input6_1, file, 90, 2, 2101);
    			attr_dev(input7_1, "type", "text");
    			attr_dev(input7_1, "placeholder", "Введите фамилию");
    			attr_dev(input7_1, "class", "svelte-5iiivh");
    			add_location(input7_1, file, 91, 2, 2169);
    			attr_dev(input8_1, "type", "email");
    			attr_dev(input8_1, "placeholder", "Введите емейл");
    			attr_dev(input8_1, "class", "svelte-5iiivh");
    			add_location(input8_1, file, 92, 2, 2241);
    			attr_dev(input9_1, "placeholder", "Введите пароль");
    			attr_dev(input9_1, "type", "password");
    			attr_dev(input9_1, "class", "svelte-5iiivh");
    			add_location(input9_1, file, 93, 2, 2312);
    			add_location(br1, file, 94, 2, 2390);
    			attr_dev(button1, "class", "svelte-5iiivh");
    			add_location(button1, file, 94, 6, 2394);
    			attr_dev(form1, "class", "form2");
    			add_location(form1, file, 87, 1, 1948);
    			add_location(h22, file, 97, 2, 2493);
    			attr_dev(input10_1, "type", "number");
    			attr_dev(input10_1, "placeholder", "Ваш ID");
    			attr_dev(input10_1, "class", "svelte-5iiivh");
    			add_location(input10_1, file, 98, 2, 2523);
    			attr_dev(input11_1, "type", "text");
    			attr_dev(input11_1, "placeholder", "Введите имя");
    			attr_dev(input11_1, "class", "svelte-5iiivh");
    			add_location(input11_1, file, 99, 2, 2589);
    			attr_dev(input12_1, "type", "text");
    			attr_dev(input12_1, "placeholder", "Введите фамилию");
    			attr_dev(input12_1, "class", "svelte-5iiivh");
    			add_location(input12_1, file, 100, 2, 2658);
    			attr_dev(input13_1, "type", "email");
    			attr_dev(input13_1, "placeholder", "Введите емейл");
    			attr_dev(input13_1, "class", "svelte-5iiivh");
    			add_location(input13_1, file, 101, 2, 2731);
    			attr_dev(input14_1, "placeholder", "Введите пароль");
    			attr_dev(input14_1, "type", "password");
    			attr_dev(input14_1, "class", "svelte-5iiivh");
    			add_location(input14_1, file, 102, 2, 2803);
    			add_location(br2, file, 103, 2, 2881);
    			attr_dev(button2, "class", "svelte-5iiivh");
    			add_location(button2, file, 103, 6, 2885);
    			attr_dev(form2, "class", "form2");
    			add_location(form2, file, 96, 1, 2435);
    			attr_dev(caption, "class", "svelte-5iiivh");
    			add_location(caption, file, 107, 2, 2990);
    			attr_dev(th0, "class", "svelte-5iiivh");
    			add_location(th0, file, 109, 2, 3032);
    			attr_dev(th1, "class", "f_name svelte-5iiivh");
    			add_location(th1, file, 109, 13, 3043);
    			attr_dev(th2, "class", "tag svelte-5iiivh");
    			add_location(th2, file, 109, 42, 3072);
    			attr_dev(th3, "class", "date svelte-5iiivh");
    			add_location(th3, file, 109, 72, 3102);
    			attr_dev(th4, "class", "date svelte-5iiivh");
    			add_location(th4, file, 109, 113, 3143);
    			attr_dev(tr0, "class", "svelte-5iiivh");
    			add_location(tr0, file, 108, 2, 3025);
    			add_location(span0, file, 112, 7, 3196);
    			attr_dev(td0, "class", "svelte-5iiivh");
    			add_location(td0, file, 112, 3, 3192);
    			add_location(span1, file, 113, 7, 3265);
    			attr_dev(td1, "class", "svelte-5iiivh");
    			add_location(td1, file, 113, 3, 3261);
    			add_location(span2, file, 114, 7, 3341);
    			attr_dev(td2, "class", "svelte-5iiivh");
    			add_location(td2, file, 114, 3, 3337);
    			attr_dev(span3, "id", "em");
    			attr_dev(span3, "class", "svelte-5iiivh");
    			add_location(span3, file, 115, 7, 3416);
    			attr_dev(td3, "class", "svelte-5iiivh");
    			add_location(td3, file, 115, 3, 3412);
    			add_location(span4, file, 116, 7, 3494);
    			attr_dev(td4, "class", "svelte-5iiivh");
    			add_location(td4, file, 116, 3, 3490);
    			attr_dev(tr1, "class", "svelte-5iiivh");
    			add_location(tr1, file, 111, 2, 3184);
    			attr_dev(table, "class", "users svelte-5iiivh");
    			attr_dev(table, "cellspacing", "0");
    			add_location(table, file, 106, 2, 2948);
    			attr_dev(div, "class", "tab svelte-5iiivh");
    			add_location(div, file, 105, 1, 2926);
    			attr_dev(main, "class", "svelte-5iiivh");
    			add_location(main, file, 76, 0, 1465);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, form0);
    			append_dev(form0, h20);
    			append_dev(form0, t1);
    			append_dev(form0, input0);
    			set_input_value(input0, /*input1*/ ctx[0]);
    			append_dev(form0, t2);
    			append_dev(form0, input1_1);
    			set_input_value(input1_1, /*input2*/ ctx[1]);
    			append_dev(form0, t3);
    			append_dev(form0, input2_1);
    			set_input_value(input2_1, /*input3*/ ctx[2]);
    			append_dev(form0, t4);
    			append_dev(form0, input3_1);
    			set_input_value(input3_1, /*input4*/ ctx[3]);
    			append_dev(form0, t5);
    			append_dev(form0, input4_1);
    			set_input_value(input4_1, /*input5*/ ctx[4]);
    			append_dev(form0, t6);
    			append_dev(form0, br0);
    			append_dev(form0, button0);
    			append_dev(main, t8);
    			append_dev(main, form1);
    			append_dev(form1, h21);
    			append_dev(form1, t10);
    			append_dev(form1, input5_1);
    			set_input_value(input5_1, /*input6*/ ctx[5]);
    			append_dev(form1, t11);
    			append_dev(form1, input6_1);
    			set_input_value(input6_1, /*input7*/ ctx[6]);
    			append_dev(form1, t12);
    			append_dev(form1, input7_1);
    			set_input_value(input7_1, /*input8*/ ctx[7]);
    			append_dev(form1, t13);
    			append_dev(form1, input8_1);
    			set_input_value(input8_1, /*input9*/ ctx[8]);
    			append_dev(form1, t14);
    			append_dev(form1, input9_1);
    			set_input_value(input9_1, /*input10*/ ctx[9]);
    			append_dev(form1, t15);
    			append_dev(form1, br1);
    			append_dev(form1, button1);
    			append_dev(main, t17);
    			append_dev(main, form2);
    			append_dev(form2, h22);
    			append_dev(form2, t19);
    			append_dev(form2, input10_1);
    			set_input_value(input10_1, /*input11*/ ctx[10]);
    			append_dev(form2, t20);
    			append_dev(form2, input11_1);
    			set_input_value(input11_1, /*input12*/ ctx[11]);
    			append_dev(form2, t21);
    			append_dev(form2, input12_1);
    			set_input_value(input12_1, /*input13*/ ctx[12]);
    			append_dev(form2, t22);
    			append_dev(form2, input13_1);
    			set_input_value(input13_1, /*input14*/ ctx[13]);
    			append_dev(form2, t23);
    			append_dev(form2, input14_1);
    			set_input_value(input14_1, /*input15*/ ctx[14]);
    			append_dev(form2, t24);
    			append_dev(form2, br2);
    			append_dev(form2, button2);
    			append_dev(main, t26);
    			append_dev(main, div);
    			append_dev(div, table);
    			append_dev(table, caption);
    			append_dev(table, t28);
    			append_dev(table, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, th1);
    			append_dev(tr0, th2);
    			append_dev(tr0, th3);
    			append_dev(tr0, th4);
    			append_dev(table, t34);
    			append_dev(table, tr1);
    			append_dev(tr1, td0);
    			append_dev(td0, span0);

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].m(span0, null);
    			}

    			append_dev(tr1, t35);
    			append_dev(tr1, td1);
    			append_dev(td1, span1);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].m(span1, null);
    			}

    			append_dev(tr1, t36);
    			append_dev(tr1, td2);
    			append_dev(td2, span2);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(span2, null);
    			}

    			append_dev(tr1, t37);
    			append_dev(tr1, td3);
    			append_dev(td3, span3);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(span3, null);
    			}

    			append_dev(tr1, t38);
    			append_dev(tr1, td4);
    			append_dev(td4, span4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(span4, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[18]),
    					listen_dev(input1_1, "input", /*input1_1_input_handler*/ ctx[19]),
    					listen_dev(input2_1, "input", /*input2_1_input_handler*/ ctx[20]),
    					listen_dev(input3_1, "input", /*input3_1_input_handler*/ ctx[21]),
    					listen_dev(input4_1, "input", /*input4_1_input_handler*/ ctx[22]),
    					listen_dev(form0, "submit", prevent_default(/*adduser*/ ctx[16]), false, true, false),
    					listen_dev(input5_1, "input", /*input5_1_input_handler*/ ctx[23]),
    					listen_dev(input6_1, "input", /*input6_1_input_handler*/ ctx[24]),
    					listen_dev(input7_1, "input", /*input7_1_input_handler*/ ctx[25]),
    					listen_dev(input8_1, "input", /*input8_1_input_handler*/ ctx[26]),
    					listen_dev(input9_1, "input", /*input9_1_input_handler*/ ctx[27]),
    					listen_dev(form1, "submit", prevent_default(/*upuser*/ ctx[17]), false, true, false),
    					listen_dev(input10_1, "input", /*input10_1_input_handler*/ ctx[28]),
    					listen_dev(input11_1, "input", /*input11_1_input_handler*/ ctx[29]),
    					listen_dev(input12_1, "input", /*input12_1_input_handler*/ ctx[30]),
    					listen_dev(input13_1, "input", /*input13_1_input_handler*/ ctx[31]),
    					listen_dev(input14_1, "input", /*input14_1_input_handler*/ ctx[32]),
    					listen_dev(form2, "submit", prevent_default(deluser), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*input1*/ 1 && to_number(input0.value) !== /*input1*/ ctx[0]) {
    				set_input_value(input0, /*input1*/ ctx[0]);
    			}

    			if (dirty[0] & /*input2*/ 2 && input1_1.value !== /*input2*/ ctx[1]) {
    				set_input_value(input1_1, /*input2*/ ctx[1]);
    			}

    			if (dirty[0] & /*input3*/ 4 && input2_1.value !== /*input3*/ ctx[2]) {
    				set_input_value(input2_1, /*input3*/ ctx[2]);
    			}

    			if (dirty[0] & /*input4*/ 8 && input3_1.value !== /*input4*/ ctx[3]) {
    				set_input_value(input3_1, /*input4*/ ctx[3]);
    			}

    			if (dirty[0] & /*input5*/ 16 && input4_1.value !== /*input5*/ ctx[4]) {
    				set_input_value(input4_1, /*input5*/ ctx[4]);
    			}

    			if (dirty[0] & /*input6*/ 32 && to_number(input5_1.value) !== /*input6*/ ctx[5]) {
    				set_input_value(input5_1, /*input6*/ ctx[5]);
    			}

    			if (dirty[0] & /*input7*/ 64 && input6_1.value !== /*input7*/ ctx[6]) {
    				set_input_value(input6_1, /*input7*/ ctx[6]);
    			}

    			if (dirty[0] & /*input8*/ 128 && input7_1.value !== /*input8*/ ctx[7]) {
    				set_input_value(input7_1, /*input8*/ ctx[7]);
    			}

    			if (dirty[0] & /*input9*/ 256 && input8_1.value !== /*input9*/ ctx[8]) {
    				set_input_value(input8_1, /*input9*/ ctx[8]);
    			}

    			if (dirty[0] & /*input10*/ 512 && input9_1.value !== /*input10*/ ctx[9]) {
    				set_input_value(input9_1, /*input10*/ ctx[9]);
    			}

    			if (dirty[0] & /*input11*/ 1024 && to_number(input10_1.value) !== /*input11*/ ctx[10]) {
    				set_input_value(input10_1, /*input11*/ ctx[10]);
    			}

    			if (dirty[0] & /*input12*/ 2048 && input11_1.value !== /*input12*/ ctx[11]) {
    				set_input_value(input11_1, /*input12*/ ctx[11]);
    			}

    			if (dirty[0] & /*input13*/ 4096 && input12_1.value !== /*input13*/ ctx[12]) {
    				set_input_value(input12_1, /*input13*/ ctx[12]);
    			}

    			if (dirty[0] & /*input14*/ 8192 && input13_1.value !== /*input14*/ ctx[13]) {
    				set_input_value(input13_1, /*input14*/ ctx[13]);
    			}

    			if (dirty[0] & /*input15*/ 16384 && input14_1.value !== /*input15*/ ctx[14]) {
    				set_input_value(input14_1, /*input15*/ ctx[14]);
    			}

    			if (dirty[0] & /*users*/ 32768) {
    				each_value_4 = /*users*/ ctx[15];
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks_4[i]) {
    						each_blocks_4[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_4[i] = create_each_block_4(child_ctx);
    						each_blocks_4[i].c();
    						each_blocks_4[i].m(span0, null);
    					}
    				}

    				for (; i < each_blocks_4.length; i += 1) {
    					each_blocks_4[i].d(1);
    				}

    				each_blocks_4.length = each_value_4.length;
    			}

    			if (dirty[0] & /*users*/ 32768) {
    				each_value_3 = /*users*/ ctx[15];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_3[i] = create_each_block_3(child_ctx);
    						each_blocks_3[i].c();
    						each_blocks_3[i].m(span1, null);
    					}
    				}

    				for (; i < each_blocks_3.length; i += 1) {
    					each_blocks_3[i].d(1);
    				}

    				each_blocks_3.length = each_value_3.length;
    			}

    			if (dirty[0] & /*users*/ 32768) {
    				each_value_2 = /*users*/ ctx[15];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(span2, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty[0] & /*users*/ 32768) {
    				each_value_1 = /*users*/ ctx[15];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(span3, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*users*/ 32768) {
    				each_value = /*users*/ ctx[15];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(span4, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks_4, detaching);
    			destroy_each(each_blocks_3, detaching);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function deluser(user, users) {
    	fetch(`http://localhost:7000/api/users/data${users}${user}`, { method: "DELETE" });
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let input1 = "";
    	let input2 = "";
    	let input3 = "";
    	let input4 = "";
    	let input5 = "";
    	let input6 = "";
    	let input7 = "";
    	let input8 = "";
    	let input9 = "";
    	let input10 = "";
    	let input11 = "";
    	let input12 = "";
    	let input13 = "";
    	let input14 = "";
    	let input15 = "";
    	let users = [];

    	async function adduser() {
    		let user = {
    			id: Number(input1),
    			firstname: input2,
    			lastname: input3,
    			email: input4,
    			pwd: input5
    		};

    		console.log({ user });

    		await fetch("http://localhost:7000/api/users", {
    			method: "POST",
    			cache: "no-cache",
    			credentials: "same-origin",
    			headers: { "Content-Type": "application/json" },
    			body: JSON.stringify({ user })
    		});
    	}

    	async function upuser() {
    		let user = {
    			id: Number(input6),
    			firstname: input7,
    			lastname: input8,
    			email: input9,
    			pwd: input10
    		};

    		await fetch("http://localhost:7000/api/users", {
    			method: "PUT",
    			cache: "no-cache",
    			credentials: "same-origin",
    			headers: { "Content-Type": "application/json" },
    			body: JSON.stringify({ user })
    		});
    	}

    	async function getResponse() {
    		let response = await fetch("http://localhost:7000/api/users");
    		let content = await response.json();
    		$$invalidate(15, users = content.data);
    		console.log(users);
    		$$invalidate(15, users = Object.values(users));
    	}

    	getResponse();
    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		input1 = to_number(this.value);
    		$$invalidate(0, input1);
    	}

    	function input1_1_input_handler() {
    		input2 = this.value;
    		$$invalidate(1, input2);
    	}

    	function input2_1_input_handler() {
    		input3 = this.value;
    		$$invalidate(2, input3);
    	}

    	function input3_1_input_handler() {
    		input4 = this.value;
    		$$invalidate(3, input4);
    	}

    	function input4_1_input_handler() {
    		input5 = this.value;
    		$$invalidate(4, input5);
    	}

    	function input5_1_input_handler() {
    		input6 = to_number(this.value);
    		$$invalidate(5, input6);
    	}

    	function input6_1_input_handler() {
    		input7 = this.value;
    		$$invalidate(6, input7);
    	}

    	function input7_1_input_handler() {
    		input8 = this.value;
    		$$invalidate(7, input8);
    	}

    	function input8_1_input_handler() {
    		input9 = this.value;
    		$$invalidate(8, input9);
    	}

    	function input9_1_input_handler() {
    		input10 = this.value;
    		$$invalidate(9, input10);
    	}

    	function input10_1_input_handler() {
    		input11 = to_number(this.value);
    		$$invalidate(10, input11);
    	}

    	function input11_1_input_handler() {
    		input12 = this.value;
    		$$invalidate(11, input12);
    	}

    	function input12_1_input_handler() {
    		input13 = this.value;
    		$$invalidate(12, input13);
    	}

    	function input13_1_input_handler() {
    		input14 = this.value;
    		$$invalidate(13, input14);
    	}

    	function input14_1_input_handler() {
    		input15 = this.value;
    		$$invalidate(14, input15);
    	}

    	$$self.$capture_state = () => ({
    		input1,
    		input2,
    		input3,
    		input4,
    		input5,
    		input6,
    		input7,
    		input8,
    		input9,
    		input10,
    		input11,
    		input12,
    		input13,
    		input14,
    		input15,
    		users,
    		adduser,
    		upuser,
    		deluser,
    		getResponse
    	});

    	$$self.$inject_state = $$props => {
    		if ("input1" in $$props) $$invalidate(0, input1 = $$props.input1);
    		if ("input2" in $$props) $$invalidate(1, input2 = $$props.input2);
    		if ("input3" in $$props) $$invalidate(2, input3 = $$props.input3);
    		if ("input4" in $$props) $$invalidate(3, input4 = $$props.input4);
    		if ("input5" in $$props) $$invalidate(4, input5 = $$props.input5);
    		if ("input6" in $$props) $$invalidate(5, input6 = $$props.input6);
    		if ("input7" in $$props) $$invalidate(6, input7 = $$props.input7);
    		if ("input8" in $$props) $$invalidate(7, input8 = $$props.input8);
    		if ("input9" in $$props) $$invalidate(8, input9 = $$props.input9);
    		if ("input10" in $$props) $$invalidate(9, input10 = $$props.input10);
    		if ("input11" in $$props) $$invalidate(10, input11 = $$props.input11);
    		if ("input12" in $$props) $$invalidate(11, input12 = $$props.input12);
    		if ("input13" in $$props) $$invalidate(12, input13 = $$props.input13);
    		if ("input14" in $$props) $$invalidate(13, input14 = $$props.input14);
    		if ("input15" in $$props) $$invalidate(14, input15 = $$props.input15);
    		if ("users" in $$props) $$invalidate(15, users = $$props.users);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		input1,
    		input2,
    		input3,
    		input4,
    		input5,
    		input6,
    		input7,
    		input8,
    		input9,
    		input10,
    		input11,
    		input12,
    		input13,
    		input14,
    		input15,
    		users,
    		adduser,
    		upuser,
    		input0_input_handler,
    		input1_1_input_handler,
    		input2_1_input_handler,
    		input3_1_input_handler,
    		input4_1_input_handler,
    		input5_1_input_handler,
    		input6_1_input_handler,
    		input7_1_input_handler,
    		input8_1_input_handler,
    		input9_1_input_handler,
    		input10_1_input_handler,
    		input11_1_input_handler,
    		input12_1_input_handler,
    		input13_1_input_handler,
    		input14_1_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	// props: {
    	// 	name: 'world'
    	// }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
