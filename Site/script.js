(function () {
    window.addEventListener("load", init);

    async function init(){
        var select = $("#tr-select");

        createOption(select, "null", "Nothing selected");
        select.onchange = onChangeSelected;

        resetCode();

        $("#tr-search").oninput = onChangeSearch;

        for (var e of $$(".lang-button")){
            e.onclick = onChangeLang;
        }

        try{
            handleTranspilers(await fetchJsonPOST("/newlist"));
        }catch(error){console.error(error);}

        // Make the main box not change size after load
        var main = $(".main");
        main.style.width = main.offsetWidth;
    }

    function onChangeSearch(e){
        for (var opt of $$("#tr-select option"))
            opt.hidden = !opt.textContent.toLowerCase().includes(e.target.value.toLowerCase());
    }

    function onChangeSelected(){
        var select = $("#tr-select");

        if (select.value == "null"){
            resetCode();
            return;
        }

        fetchCode("decomp", select.value, false);
    }

    async function fetchCode(action, id, isIL){
        for (var pre of $$(".code-tab pre, .code-tab code")){
            pre.classList.replace(
                isIL ? "language-csharp" : "language-cil", 
                !isIL ? "language-csharp" : "language-cil"
            );
        }

        $("#il-diff-note").style.display = isIL ? "block" : "none";

        $("#code-label").textContent = "Decompiling...";
        
        var orig = await fetchJsonPOST(`/${action}/${id}/original`).catch(console.error);
        if (!orig || orig.exception){
            $("#code1 code").textContent = orig?.exception ?? "Request error";
            orig = null;
        }

        var tr = await fetchJsonPOST(`/${action}/${id}/transpiled`).catch(console.error);
        if (!tr || tr.exception){
            $("#code2 code").textContent = tr?.exception ?? "Request error";
            tr = null;
        }

        if (orig && tr){
            $("#code-label").textContent = "Diffing and highlighting...";
            breath(() => {
                diffAndSetCode(orig.code, tr.code, isIL);
                setCodeLabelToSelected();
            });
            return;
        }

        $("#code-label").textContent = "Highlighting...";
        
        breath(() => {
            $("#code1pre").dataset.line = "";
            $("#code2pre").dataset.line = "";

            if (orig)
                $("#code1 code").textContent = orig.code;

            if (tr)
                $("#code2 code").textContent = tr.code;

            Prism.highlightAll();
            setCodeLabelToSelected();
        });
    }

    function setCodeLabelToSelected(){
        var select = $("#tr-select");
        var selectName = select.options[select.selectedIndex].innerHTML;
        $("#code-label").textContent = selectName;
    }

    var NON_TRAILING_NEWLINE = /\n(?!$)/g;
    var LEADING_TABS = /^\t*/g;
    var IL_LABEL = /IL_[0-9a-f]{4}/g;

    function diffAndSetCode(code1, code2, ignoreIlLabels){
        code1 = code1.replaceAll("\r\n", "\n");
        code2 = code2.replaceAll("\r\n", "\n");

        var todiff = [code1, code2].map(c => c.split(NON_TRAILING_NEWLINE).map(l => l.replace(LEADING_TABS, "")).join("\n"));
        if (ignoreIlLabels)
            todiff = todiff.map(c => c.replaceAll(IL_LABEL, ""));

        var diff = customDiffLines(todiff[0], todiff[1], code1, code2);

        var codes = ["",""];
        var curline = 0;
        var removed = "";
        var added = "";

        for (var i = 0; i < diff.length; i++){
            var part = diff[i];

            // Removed and added parts overlap
            if (part.removed && diff[i+1] && diff[i+1].added){
                var next = diff[i+1];
                var d = part.count - next.count;

                codes[0] += part.values[0];
                codes[1] += next.values[1];

                for (var j=0;j<Math.abs(d);j++){
                    if (d < 0) codes[0] += "\n";
                    else codes[1] += '\n';
                }

                var p = curline;
                curline += Math.max(part.count,next.count);

                var short = p+Math.min(part.count,next.count);

                if (d > 0){
                    added += `${p+1}-${short},${short+1}-${short+Math.abs(d)},`;
                    removed += `${p+1}-${curline},`;
                }else{
                    added += `${p+1}-${curline},`;
                    removed += `${p+1}-${short},${short+1}-${short+Math.abs(d)},`;
                }

                i++;
                continue;
            }

            if (part.added || part.removed) {
                if (part.added) {
                    codes[1] += part.values[1];
                    codes[0] += "\n".repeat(part.count);
                }
                else {
                    codes[0] += part.values[0];
                    codes[1] += "\n".repeat(part.count);
                }

                var p = curline;
                curline += part.count;
                added += `${p+1}-${curline},`;
                removed += `${p+1}-${curline},`;
            }
            else { 
                codes[0] += part.values[0];
                codes[1] += part.values[1];
                curline += part.count; 
            }
        }
        
        $("#code1 code").textContent = codes[0];
        $("#code1pre").dataset.line = removed;

        $("#code2 code").textContent = codes[1];
        $("#code2pre").dataset.line = added;

        Prism.highlightAll();

        var linesLeft = codes[0].split(NON_TRAILING_NEWLINE);
        var linesRight = codes[1].split(NON_TRAILING_NEWLINE);

        var oneLineHeight = lineNumbersGetOneLineHeight();

        // Make line heights on both sides even
        for (var i = 0; i < linesLeft.length; i++){
            var rowsLeft = $("#code1 .line-numbers-rows");
            var rowsRight = $("#code2 .line-numbers-rows");

            var displayedLinesLeft = Math.round(parseFloat(rowsLeft.children[i].style.height) / oneLineHeight);
            var displayedLinesRight = Math.round(parseFloat(rowsRight.children[i].style.height) / oneLineHeight);

            // \u200b is the zero-width space and \u200c is the zero-width non-joiner (a random z-w char different from the space)
            // \u200b\n is a marked newline, not treated as one by the Line Numbers plugin (edited to do so)
            // \u200c causes the (would-be-trailing) \n to not be omitted when calculating the line height
            if (displayedLinesLeft > displayedLinesRight){
                linesRight[i] += "\u200b\n\u200c".repeat(displayedLinesLeft - displayedLinesRight);
            }else if (displayedLinesRight > displayedLinesLeft){
                linesLeft[i] += "\u200b\n\u200c".repeat(displayedLinesRight - displayedLinesLeft);
            }
        }

        $("#code1 code").textContent = linesLeft.join("\n");
        $("#code2 code").textContent = linesRight.join("\n");

        Prism.highlightAll();
    }

    function lineNumbersGetOneLineHeight(){
        var lineNumberSizer = $('#code1 .line-numbers-sizer');
        lineNumberSizer.innerHTML = '0';
        lineNumberSizer.style.display = 'block';
        var oneLineHeight = lineNumberSizer.getBoundingClientRect().height;
        lineNumberSizer.innerHTML = '';

        return oneLineHeight;
    }

    function customDiffLines(one, two, origOne, origTwo){
        var result = Diff.diffLines(one, two);
        var curLines = [0, 0];
        var origLines = [origOne.split("\n"), origTwo.split("\n")];

        var handlePart = function (part, side){
            part.values = ["", ""];

            for (var s of (side == 2 ? [0,1] : [side])){
                for (var k = 0; k < part.count; k++)
                    part.values[s] += (origLines[s][curLines[s] + k] + "\n");

                curLines[s] += part.count;
            }
        }

        for (var part of result){
            if (part.removed){
                handlePart(part, 0);
            }else if (part.added){
                handlePart(part, 1);
            }else{
                handlePart(part, 2);
            }
        }

        return result;
    }

    function onChangeLang(e){
        var select = $("#tr-select");
        if (select.value == "null") return;

        var isil = e.target.textContent == "IL";

        fetchCode(
            isil ? "disasm" : "decomp", 
            select.value,
            isil
        );
    }

    function handleTranspilers(json){
        var select = $("#tr-select");
        select.innerHTML = "";

        createOption(select, "null", "Nothing selected");

        var index = 0;

        for (var tr of json["transpilers"])
        {
            createOption(select, index, `${tr["transpiler"]} on ${tr["original"]} ${tr.erroring ? " (Erroring)" : ""}`);
            index++;
        }
    }

    function resetCode(){
        $("#code-label").innerHTML = "Nothing";
        $("#code1 code").innerHTML = "// Nothing selected";
        $("#code2 code").innerHTML = "// Nothing selected";
        $("#code1pre").dataset.line = "";
        $("#code2pre").dataset.line = "";

        Prism.highlightAll();
    }

    function createOption(select, value, text){
        var opt = document.createElement("option");
        opt.value = value;
        opt.innerHTML = text;

        select.appendChild(opt);
    }

    async function fetchJsonPOST(url){
        return await (await fetch(url, { "method": "POST" })).json();
    }

    function changeListDisabled(status){
        for (var opt of $$("#tr-select option"))
            opt.disabled = status;
    }

    function $$(selector, container) {
        return Array.prototype.slice.call((container || document).querySelectorAll(selector));
    }

    function $(selector, container) {
        return (container || document).querySelector(selector);
    }
    
    function breath(f){
        setTimeout(f, 0);
    }
}());