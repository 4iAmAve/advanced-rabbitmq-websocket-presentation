
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
(function () {
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

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
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
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
        const prop_values = options.props || {};
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
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
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
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
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
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.24.0 */

    const file = "src/App.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-1nvtr7c-style";
    	style.textContent = "#moduleMain{max-width:880px;padding:16px}b.svelte-1nvtr7c{word-break:break-all}.input.svelte-1nvtr7c{display:flex}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c2NyaXB0IGxhbmc9XCJ0c1wiPmV4cG9ydCBsZXQgZW52O1xuZXhwb3J0IGxldCBiYXNlVVJMO1xuZXhwb3J0IGxldCBsb2NhbGU7XG5leHBvcnQgbGV0IHVzZXI7XG5leHBvcnQgbGV0IHB1Ymxpc2hUb1RvcGljO1xuZXhwb3J0IGxldCBzdWJzY3JpYmVUb1RvcGljO1xuZXhwb3J0IGxldCB1bnN1YnNjcmliZUZyb21Ub2tlbjtcbmxldCB0b2FzdFRleHQgPSAnJztcbmxldCBzZWxlY3RlZFRvYXN0VHlwZTtcbmxldCBzdWNjZXNzID0gJ3N1Y2Nlc3MnO1xubGV0IGVycm9yID0gJ2Vycm9yJztcbmxldCBzdWJUb3BpYyA9ICcnO1xubGV0IHVuc3ViVG9waWMgPSAnJztcbmZ1bmN0aW9uIHNob3dUb2FzdCgpIHtcbiAgICBwdWJsaXNoVG9Ub3BpYygnd2lwLnRvYXN0LmFkZCcsIHsgdHlwZTogc2VsZWN0ZWRUb2FzdFR5cGUsIG1lc3NhZ2U6IHRvYXN0VGV4dCB9KTtcbn1cbmZ1bmN0aW9uIHNob3dFcnJvcigpIHtcbiAgICBwdWJsaXNoVG9Ub3BpYygnd2lwLmVycm9yLnNob3cnKTtcbn1cbmZ1bmN0aW9uIG5hdmlnYXRlKCkge1xuICAgIHB1Ymxpc2hUb1RvcGljKCd3aXAubmF2aWdhdGlvbi5uYXZpZ2F0ZScsICcvJyk7XG59XG5mdW5jdGlvbiByZXF1ZXN0TG9naW4oKSB7XG4gICAgcHVibGlzaFRvVG9waWMoJ3dpcC5yZXF1ZXN0TG9naW4nLCAnLycpO1xufVxuZnVuY3Rpb24gcmVxdWVzdExvZ291dCgpIHtcbiAgICBwdWJsaXNoVG9Ub3BpYygnd2lwLnJlcXVlc3RMb2dvdXQnLCAnLycpO1xufVxuZnVuY3Rpb24gdW5zdWJzY3JpYmUoKSB7XG4gICAgdW5zdWJzY3JpYmVGcm9tVG9rZW4odW5zdWJUb3BpYyk7XG59XG5mdW5jdGlvbiBzdWJzY3JpYmUoKSB7XG4gICAgc3Vic2NyaWJlVG9Ub3BpYyhzdWJUb3BpYywgKCkgPT4geyB9KTtcbn1cbmZ1bmN0aW9uIHNob3dNb2RhbCgpIHtcbiAgICAvLyBUT0RPXG59XG48L3NjcmlwdD5cblxuPHN0eWxlPlxuOmdsb2JhbCgjbW9kdWxlTWFpbikge1xuICBtYXgtd2lkdGg6IDg4MHB4O1xuICBwYWRkaW5nOiAxNnB4O1xufVxuYiB7XG4gIHdvcmQtYnJlYWs6IGJyZWFrLWFsbDtcbn1cbi5pbnB1dCB7XG4gIGRpc3BsYXk6IGZsZXg7XG59XG48L3N0eWxlPlxuXG48ZGl2PlxuICBZb3UgYXJlIHJ1bm5pbmcgb24gc3RhZ2U6XG4gIDxiPntlbnZ9PC9iPlxuPC9kaXY+XG48ZGl2PlxuICBUaGUgYmFzZVVSTCBpczpcbiAgPGI+e2Jhc2VVUkx9PC9iPlxuPC9kaXY+XG48ZGl2PlxuICBUaGUgbG9jYWxlIGlzOlxuICA8Yj57bG9jYWxlfTwvYj5cbjwvZGl2PlxuPGRpdj5cbiAgVGhlIHVzZXIgb2JqZWN0IGlzOlxuICA8Yj57SlNPTi5zdHJpbmdpZnkodXNlcil9PC9iPlxuPC9kaXY+XG5cbjxkaXYgY2xhc3M9XCJpbnB1dFwiPlxuICA8aW5wdXQgZGF0YS10ZXN0aWQ9XCJ0b2FzdFRleHRcIiB0eXBlPVwidGV4dFwiIGJpbmQ6dmFsdWU9e3RvYXN0VGV4dH0gLz5cbiAgPHNlbGVjdCBkYXRhLXRlc3RpZD1cInRvYXN0VHlwZVNlbGVjdFwiIGJpbmQ6dmFsdWU9e3NlbGVjdGVkVG9hc3RUeXBlfT5cbiAgICA8b3B0aW9uIHZhbHVlPXtzdWNjZXNzfT57c3VjY2Vzc308L29wdGlvbj5cbiAgICA8b3B0aW9uIHZhbHVlPXtlcnJvcn0+e2Vycm9yfTwvb3B0aW9uPlxuICA8L3NlbGVjdD5cbiAgPGJ1dHRvbiBkYXRhLXRlc3RpZD1cInNob3dUb2FzdEJ0blwiIGNsYXNzPVwibXlCdG5cIiBvbjpjbGljaz17c2hvd1RvYXN0fT5TaG93IFRvYXN0PC9idXR0b24+XG48L2Rpdj5cbjxkaXYgY2xhc3M9XCJpbnB1dFwiPlxuICA8aW5wdXQgdHlwZT1cInRleHRcIiBiaW5kOnZhbHVlPXtzdWJUb3BpY30gLz5cbiAgPGJ1dHRvbiBjbGFzcz1cIm15QnRuXCIgb246Y2xpY2s9e3N1YnNjcmliZX0+U3Vic2NyaWJlIFRvIFRvcGljPC9idXR0b24+XG48L2Rpdj5cbjxkaXYgY2xhc3M9XCJpbnB1dFwiPlxuICA8aW5wdXQgdHlwZT1cInRleHRcIiBiaW5kOnZhbHVlPXt1bnN1YlRvcGljfSAvPlxuICA8YnV0dG9uIGNsYXNzPVwibXlCdG5cIiBvbjpjbGljaz17dW5zdWJzY3JpYmV9PlVuc3Vic2NyaWJlIEZyb20gVG9waWM8L2J1dHRvbj5cbjwvZGl2PlxuPGJ1dHRvbiBjbGFzcz1cIm15QnRuXCIgZGF0YS10ZXN0aWQ9XCJzaG93RXJyb3JCdG5cIiBvbjpjbGljaz17c2hvd0Vycm9yfT5TaG93IEVycm9yPC9idXR0b24+XG48YnV0dG9uIGNsYXNzPVwibXlCdG5cIiBvbjpjbGljaz17bmF2aWdhdGV9Pk5hdmlnYXRlIHRvIC88L2J1dHRvbj5cbjxidXR0b24gY2xhc3M9XCJteUJ0blwiIG9uOmNsaWNrPXtyZXF1ZXN0TG9naW59PlJlcXVlc3QgTG9naW48L2J1dHRvbj5cbjxidXR0b24gY2xhc3M9XCJteUJ0blwiIG9uOmNsaWNrPXtyZXF1ZXN0TG9nb3V0fT5SZXF1ZXN0IExvZ291dDwvYnV0dG9uPlxuPGJ1dHRvbiBjbGFzcz1cIm15QnRuXCIgZGF0YS10ZXN0aWQ9XCJzaG93TW9kYWxCdG5cIiBvbjpjbGljaz17c2hvd01vZGFsfT5TaG93IE1vZGFsPC9idXR0b24+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBd0NRLFdBQVcsQUFBRSxDQUFDLEFBQ3BCLFNBQVMsQ0FBRSxLQUFLLENBQ2hCLE9BQU8sQ0FBRSxJQUFJLEFBQ2YsQ0FBQyxBQUNELENBQUMsZUFBQyxDQUFDLEFBQ0QsVUFBVSxDQUFFLFNBQVMsQUFDdkIsQ0FBQyxBQUNELE1BQU0sZUFBQyxDQUFDLEFBQ04sT0FBTyxDQUFFLElBQUksQUFDZixDQUFDIn0= */";
    	append_dev(document.head, style);
    }

    function create_fragment(ctx) {
    	let div0;
    	let t0;
    	let b0;
    	let t1;
    	let t2;
    	let div1;
    	let t3;
    	let b1;
    	let t4;
    	let t5;
    	let div2;
    	let t6;
    	let b2;
    	let t7;
    	let t8;
    	let div3;
    	let t9;
    	let b3;
    	let t10_value = JSON.stringify(/*user*/ ctx[3]) + "";
    	let t10;
    	let t11;
    	let div4;
    	let input0;
    	let t12;
    	let select;
    	let option0;
    	let t13;
    	let option1;
    	let t14;
    	let t15;
    	let button0;
    	let t17;
    	let div5;
    	let input1;
    	let t18;
    	let button1;
    	let t20;
    	let div6;
    	let input2;
    	let t21;
    	let button2;
    	let t23;
    	let button3;
    	let t25;
    	let button4;
    	let t27;
    	let button5;
    	let t29;
    	let button6;
    	let t31;
    	let button7;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text("You are running on stage:\n  ");
    			b0 = element("b");
    			t1 = text(/*env*/ ctx[0]);
    			t2 = space();
    			div1 = element("div");
    			t3 = text("The baseURL is:\n  ");
    			b1 = element("b");
    			t4 = text(/*baseURL*/ ctx[1]);
    			t5 = space();
    			div2 = element("div");
    			t6 = text("The locale is:\n  ");
    			b2 = element("b");
    			t7 = text(/*locale*/ ctx[2]);
    			t8 = space();
    			div3 = element("div");
    			t9 = text("The user object is:\n  ");
    			b3 = element("b");
    			t10 = text(t10_value);
    			t11 = space();
    			div4 = element("div");
    			input0 = element("input");
    			t12 = space();
    			select = element("select");
    			option0 = element("option");
    			t13 = text(/*success*/ ctx[8]);
    			option1 = element("option");
    			t14 = text(/*error*/ ctx[9]);
    			t15 = space();
    			button0 = element("button");
    			button0.textContent = "Show Toast";
    			t17 = space();
    			div5 = element("div");
    			input1 = element("input");
    			t18 = space();
    			button1 = element("button");
    			button1.textContent = "Subscribe To Topic";
    			t20 = space();
    			div6 = element("div");
    			input2 = element("input");
    			t21 = space();
    			button2 = element("button");
    			button2.textContent = "Unsubscribe From Topic";
    			t23 = space();
    			button3 = element("button");
    			button3.textContent = "Show Error";
    			t25 = space();
    			button4 = element("button");
    			button4.textContent = "Navigate to /";
    			t27 = space();
    			button5 = element("button");
    			button5.textContent = "Request Login";
    			t29 = space();
    			button6 = element("button");
    			button6.textContent = "Request Logout";
    			t31 = space();
    			button7 = element("button");
    			button7.textContent = "Show Modal";
    			attr_dev(b0, "class", "svelte-1nvtr7c");
    			add_location(b0, file, 54, 2, 1062);
    			add_location(div0, file, 52, 0, 1026);
    			attr_dev(b1, "class", "svelte-1nvtr7c");
    			add_location(b1, file, 58, 2, 1108);
    			add_location(div1, file, 56, 0, 1082);
    			attr_dev(b2, "class", "svelte-1nvtr7c");
    			add_location(b2, file, 62, 2, 1157);
    			add_location(div2, file, 60, 0, 1132);
    			attr_dev(b3, "class", "svelte-1nvtr7c");
    			add_location(b3, file, 66, 2, 1210);
    			add_location(div3, file, 64, 0, 1180);
    			attr_dev(input0, "data-testid", "toastText");
    			attr_dev(input0, "type", "text");
    			add_location(input0, file, 70, 2, 1270);
    			option0.__value = /*success*/ ctx[8];
    			option0.value = option0.__value;
    			add_location(option0, file, 72, 4, 1415);
    			option1.__value = /*error*/ ctx[9];
    			option1.value = option1.__value;
    			add_location(option1, file, 73, 4, 1462);
    			attr_dev(select, "data-testid", "toastTypeSelect");
    			if (/*selectedToastType*/ ctx[5] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[21].call(select));
    			add_location(select, file, 71, 2, 1341);
    			attr_dev(button0, "data-testid", "showToastBtn");
    			attr_dev(button0, "class", "myBtn");
    			add_location(button0, file, 75, 2, 1515);
    			attr_dev(div4, "class", "input svelte-1nvtr7c");
    			add_location(div4, file, 69, 0, 1248);
    			attr_dev(input1, "type", "text");
    			add_location(input1, file, 78, 2, 1634);
    			attr_dev(button1, "class", "myBtn");
    			add_location(button1, file, 79, 2, 1680);
    			attr_dev(div5, "class", "input svelte-1nvtr7c");
    			add_location(div5, file, 77, 0, 1612);
    			attr_dev(input2, "type", "text");
    			add_location(input2, file, 82, 2, 1780);
    			attr_dev(button2, "class", "myBtn");
    			add_location(button2, file, 83, 2, 1828);
    			attr_dev(div6, "class", "input svelte-1nvtr7c");
    			add_location(div6, file, 81, 0, 1758);
    			attr_dev(button3, "class", "myBtn");
    			attr_dev(button3, "data-testid", "showErrorBtn");
    			add_location(button3, file, 85, 0, 1912);
    			attr_dev(button4, "class", "myBtn");
    			add_location(button4, file, 86, 0, 2002);
    			attr_dev(button5, "class", "myBtn");
    			add_location(button5, file, 87, 0, 2067);
    			attr_dev(button6, "class", "myBtn");
    			add_location(button6, file, 88, 0, 2136);
    			attr_dev(button7, "class", "myBtn");
    			attr_dev(button7, "data-testid", "showModalBtn");
    			add_location(button7, file, 89, 0, 2207);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			append_dev(div0, b0);
    			append_dev(b0, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, t3);
    			append_dev(div1, b1);
    			append_dev(b1, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, t6);
    			append_dev(div2, b2);
    			append_dev(b2, t7);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, t9);
    			append_dev(div3, b3);
    			append_dev(b3, t10);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, input0);
    			set_input_value(input0, /*toastText*/ ctx[4]);
    			append_dev(div4, t12);
    			append_dev(div4, select);
    			append_dev(select, option0);
    			append_dev(option0, t13);
    			append_dev(select, option1);
    			append_dev(option1, t14);
    			select_option(select, /*selectedToastType*/ ctx[5]);
    			append_dev(div4, t15);
    			append_dev(div4, button0);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, input1);
    			set_input_value(input1, /*subTopic*/ ctx[6]);
    			append_dev(div5, t18);
    			append_dev(div5, button1);
    			insert_dev(target, t20, anchor);
    			insert_dev(target, div6, anchor);
    			append_dev(div6, input2);
    			set_input_value(input2, /*unsubTopic*/ ctx[7]);
    			append_dev(div6, t21);
    			append_dev(div6, button2);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, button3, anchor);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, button4, anchor);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, button5, anchor);
    			insert_dev(target, t29, anchor);
    			insert_dev(target, button6, anchor);
    			insert_dev(target, t31, anchor);
    			insert_dev(target, button7, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[20]),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[21]),
    					listen_dev(button0, "click", /*showToast*/ ctx[10], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[22]),
    					listen_dev(button1, "click", /*subscribe*/ ctx[16], false, false, false),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[23]),
    					listen_dev(button2, "click", /*unsubscribe*/ ctx[15], false, false, false),
    					listen_dev(button3, "click", /*showError*/ ctx[11], false, false, false),
    					listen_dev(button4, "click", /*navigate*/ ctx[12], false, false, false),
    					listen_dev(button5, "click", /*requestLogin*/ ctx[13], false, false, false),
    					listen_dev(button6, "click", /*requestLogout*/ ctx[14], false, false, false),
    					listen_dev(button7, "click", showModal, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*env*/ 1) set_data_dev(t1, /*env*/ ctx[0]);
    			if (dirty & /*baseURL*/ 2) set_data_dev(t4, /*baseURL*/ ctx[1]);
    			if (dirty & /*locale*/ 4) set_data_dev(t7, /*locale*/ ctx[2]);
    			if (dirty & /*user*/ 8 && t10_value !== (t10_value = JSON.stringify(/*user*/ ctx[3]) + "")) set_data_dev(t10, t10_value);

    			if (dirty & /*toastText*/ 16 && input0.value !== /*toastText*/ ctx[4]) {
    				set_input_value(input0, /*toastText*/ ctx[4]);
    			}

    			if (dirty & /*selectedToastType, error, success*/ 800) {
    				select_option(select, /*selectedToastType*/ ctx[5]);
    			}

    			if (dirty & /*subTopic*/ 64 && input1.value !== /*subTopic*/ ctx[6]) {
    				set_input_value(input1, /*subTopic*/ ctx[6]);
    			}

    			if (dirty & /*unsubTopic*/ 128 && input2.value !== /*unsubTopic*/ ctx[7]) {
    				set_input_value(input2, /*unsubTopic*/ ctx[7]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(div3);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(div4);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(div5);
    			if (detaching) detach_dev(t20);
    			if (detaching) detach_dev(div6);
    			if (detaching) detach_dev(t23);
    			if (detaching) detach_dev(button3);
    			if (detaching) detach_dev(t25);
    			if (detaching) detach_dev(button4);
    			if (detaching) detach_dev(t27);
    			if (detaching) detach_dev(button5);
    			if (detaching) detach_dev(t29);
    			if (detaching) detach_dev(button6);
    			if (detaching) detach_dev(t31);
    			if (detaching) detach_dev(button7);
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

    function showModal() {
    	
    } // TODO

    function instance($$self, $$props, $$invalidate) {
    	let { env } = $$props;
    	let { baseURL } = $$props;
    	let { locale } = $$props;
    	let { user } = $$props;
    	let { publishToTopic } = $$props;
    	let { subscribeToTopic } = $$props;
    	let { unsubscribeFromToken } = $$props;
    	let toastText = "";
    	let selectedToastType;
    	let success = "success";
    	let error = "error";
    	let subTopic = "";
    	let unsubTopic = "";

    	function showToast() {
    		publishToTopic("wip.toast.add", {
    			type: selectedToastType,
    			message: toastText
    		});
    	}

    	function showError() {
    		publishToTopic("wip.error.show");
    	}

    	function navigate() {
    		publishToTopic("wip.navigation.navigate", "/");
    	}

    	function requestLogin() {
    		publishToTopic("wip.requestLogin", "/");
    	}

    	function requestLogout() {
    		publishToTopic("wip.requestLogout", "/");
    	}

    	function unsubscribe() {
    		unsubscribeFromToken(unsubTopic);
    	}

    	function subscribe() {
    		subscribeToTopic(subTopic, () => {
    			
    		});
    	}

    	const writable_props = [
    		"env",
    		"baseURL",
    		"locale",
    		"user",
    		"publishToTopic",
    		"subscribeToTopic",
    		"unsubscribeFromToken"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function input0_input_handler() {
    		toastText = this.value;
    		$$invalidate(4, toastText);
    	}

    	function select_change_handler() {
    		selectedToastType = select_value(this);
    		$$invalidate(5, selectedToastType);
    		$$invalidate(9, error);
    		$$invalidate(8, success);
    	}

    	function input1_input_handler() {
    		subTopic = this.value;
    		$$invalidate(6, subTopic);
    	}

    	function input2_input_handler() {
    		unsubTopic = this.value;
    		$$invalidate(7, unsubTopic);
    	}

    	$$self.$set = $$props => {
    		if ("env" in $$props) $$invalidate(0, env = $$props.env);
    		if ("baseURL" in $$props) $$invalidate(1, baseURL = $$props.baseURL);
    		if ("locale" in $$props) $$invalidate(2, locale = $$props.locale);
    		if ("user" in $$props) $$invalidate(3, user = $$props.user);
    		if ("publishToTopic" in $$props) $$invalidate(17, publishToTopic = $$props.publishToTopic);
    		if ("subscribeToTopic" in $$props) $$invalidate(18, subscribeToTopic = $$props.subscribeToTopic);
    		if ("unsubscribeFromToken" in $$props) $$invalidate(19, unsubscribeFromToken = $$props.unsubscribeFromToken);
    	};

    	$$self.$capture_state = () => ({
    		env,
    		baseURL,
    		locale,
    		user,
    		publishToTopic,
    		subscribeToTopic,
    		unsubscribeFromToken,
    		toastText,
    		selectedToastType,
    		success,
    		error,
    		subTopic,
    		unsubTopic,
    		showToast,
    		showError,
    		navigate,
    		requestLogin,
    		requestLogout,
    		unsubscribe,
    		subscribe,
    		showModal
    	});

    	$$self.$inject_state = $$props => {
    		if ("env" in $$props) $$invalidate(0, env = $$props.env);
    		if ("baseURL" in $$props) $$invalidate(1, baseURL = $$props.baseURL);
    		if ("locale" in $$props) $$invalidate(2, locale = $$props.locale);
    		if ("user" in $$props) $$invalidate(3, user = $$props.user);
    		if ("publishToTopic" in $$props) $$invalidate(17, publishToTopic = $$props.publishToTopic);
    		if ("subscribeToTopic" in $$props) $$invalidate(18, subscribeToTopic = $$props.subscribeToTopic);
    		if ("unsubscribeFromToken" in $$props) $$invalidate(19, unsubscribeFromToken = $$props.unsubscribeFromToken);
    		if ("toastText" in $$props) $$invalidate(4, toastText = $$props.toastText);
    		if ("selectedToastType" in $$props) $$invalidate(5, selectedToastType = $$props.selectedToastType);
    		if ("success" in $$props) $$invalidate(8, success = $$props.success);
    		if ("error" in $$props) $$invalidate(9, error = $$props.error);
    		if ("subTopic" in $$props) $$invalidate(6, subTopic = $$props.subTopic);
    		if ("unsubTopic" in $$props) $$invalidate(7, unsubTopic = $$props.unsubTopic);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		env,
    		baseURL,
    		locale,
    		user,
    		toastText,
    		selectedToastType,
    		subTopic,
    		unsubTopic,
    		success,
    		error,
    		showToast,
    		showError,
    		navigate,
    		requestLogin,
    		requestLogout,
    		unsubscribe,
    		subscribe,
    		publishToTopic,
    		subscribeToTopic,
    		unsubscribeFromToken,
    		input0_input_handler,
    		select_change_handler,
    		input1_input_handler,
    		input2_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1nvtr7c-style")) add_css();

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			env: 0,
    			baseURL: 1,
    			locale: 2,
    			user: 3,
    			publishToTopic: 17,
    			subscribeToTopic: 18,
    			unsubscribeFromToken: 19
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*env*/ ctx[0] === undefined && !("env" in props)) {
    			console.warn("<App> was created without expected prop 'env'");
    		}

    		if (/*baseURL*/ ctx[1] === undefined && !("baseURL" in props)) {
    			console.warn("<App> was created without expected prop 'baseURL'");
    		}

    		if (/*locale*/ ctx[2] === undefined && !("locale" in props)) {
    			console.warn("<App> was created without expected prop 'locale'");
    		}

    		if (/*user*/ ctx[3] === undefined && !("user" in props)) {
    			console.warn("<App> was created without expected prop 'user'");
    		}

    		if (/*publishToTopic*/ ctx[17] === undefined && !("publishToTopic" in props)) {
    			console.warn("<App> was created without expected prop 'publishToTopic'");
    		}

    		if (/*subscribeToTopic*/ ctx[18] === undefined && !("subscribeToTopic" in props)) {
    			console.warn("<App> was created without expected prop 'subscribeToTopic'");
    		}

    		if (/*unsubscribeFromToken*/ ctx[19] === undefined && !("unsubscribeFromToken" in props)) {
    			console.warn("<App> was created without expected prop 'unsubscribeFromToken'");
    		}
    	}

    	get env() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set env(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get baseURL() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set baseURL(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get locale() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set locale(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get user() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set user(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get publishToTopic() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set publishToTopic(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get subscribeToTopic() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set subscribeToTopic(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get unsubscribeFromToken() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set unsubscribeFromToken(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const getComponent = (props) => {
        const Component = document.createElement('div');
        Component.id = 'moduleMain';
        new App({
            target: Component,
            props,
        });
        return Component;
    };

    const props = {
        env: 'local',
        baseURL: '/',
        locale: 'deDE',
        user: { auth: null, userInfo: { accountId: '123', email: 'test@wip.de', sub: '' } },
        publishToTopic: (topic, data) => {
            console.log(topic, data);
            return true;
        },
        subscribeToTopic: (topic, callback) => {
            callback(topic, '');
            return topic;
        },
        unsubscribeFromToken: (token) => true,
    };
    document.getElementsByTagName('body')[0].appendChild(getComponent(props));

}());
//# sourceMappingURL=bundle.js.map
