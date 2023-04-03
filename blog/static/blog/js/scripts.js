var START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
var _engine, _curmoves = [];
var _history = [
        [START]
    ],
    _history2 = null,
    _historyindex = 0;
var _flip = false,
    _edit = false,
    _info = false,
    _play = null;
var _arrow = false,
    _menu = false;
var _dragElement = null,
    _dragActive = false,
    _startX, _startY, _dragCtrl, _dragLMB, _clickFrom, _clickFromElem;
var _tooltipState = false,
    _wantUpdateInfo = true;;
var _wname = "White",
    _bname = "Black",
    _color = 0,
    _bodyScale = 1;
var _nncache = null;
var _gameMode = 1;
var _isPlayerWhite = true;

document.addEventListener("DOMContentLoaded", function(e) {
    var url = new URL(document.URL);
    var search_params = new URLSearchParams(url.search);

    if (search_params.has('mode') == true) {
        var mode = search_params.get('mode');

        if (mode == "play") {
            menuPlayEngineWhite();
        }
    }
});

function setElemText(elem, value) {
    while (elem.firstChild) elem.removeChild(elem.firstChild);
    elem.appendChild(document.createTextNode(value));
}

function getElemText(elem) {
    return elem.innerText || elem.textContent;
}

function setCurFEN(fen) {
    setElemText(document.getElementById('fen'), fen);
}

function getCurFEN() {
    return getElemText(document.getElementById('fen'));
}

// Input box and commands

function command(text) {
    if (text == null || text.length == 0) return;
    var mvdivs = ['<div class="moves">', '<div class="tview2 tview2-column">', '<div class="extension-item Moves">'];
    for (var i = 0; i < mvdivs.length; i++) {
        if (text.indexOf(mvdivs[i]) >= 0) {
            var text2 = text,
                ntext = '';
            text2 = text2.replace(/<span class="user_link[^>]*>([^<]*)<\/span>/g, "<a class=\"user_link\">$1</a>");
            var nmt = '<a class="user_link';
            if (text2.indexOf(nmt) > 0) {
                text2 = text2.substr(text2.indexOf(nmt) + nmt.length);
                text2 = text2.substr(text2.indexOf(">") + 1);
                ntext += "[White \"" + text2.substr(0, text2.indexOf("</a>")).replace(/<span[^>]*>[^<]*<\/span>/g, "").replace(/&nbsp;/g, " ").trim() + "\"]\n";
                text2 = text2.substr(text2.indexOf("</a>") + 4);
            }
            if (text2.indexOf(nmt) > 0) {
                text2 = text2.substr(text2.indexOf(nmt) + nmt.length);
                text2 = text2.substr(text2.indexOf(">") + 1);
                ntext += "[Black \"" + text2.substr(0, text2.indexOf("</a>")).replace(/<span[^>]*>[^<]*<\/span>/g, "").replace(/&nbsp;/g, " ").trim() + "\"]\n";
                text2 = text2.substr(text2.indexOf("</a>") + 4);
            }
            text2 = text;
            nmt = '<div class="playerInfo';
            for (var j = 0; j < 2; j++)
                if (text2.indexOf(nmt) > 0) {
                    text2 = text2.substr(text2.indexOf(nmt));
                    var black = text2.indexOf("black") < text2.indexOf(">");
                    text2 = text2.substr(nmt.length);
                    var h = '<h2 class="name">';
                    var nm = "[" + (black ? "Black" : "White") + " \"" + text2.substring(text2.indexOf(h) + h.length, text2.indexOf('</h2>')).trim() + "\"]\n";
                    if (j == 1 && !black) ntext = nm + ntext;
                    else ntext += nm;
                }

            text = text.substring(text.indexOf(mvdivs[i]));
            if (i == 2) text = text.replace(/<div class="notationTableInlineElement((?!<\/div>).)*<\/div>/g, "");
            text = text.substring(mvdivs[i].length, text.indexOf('</div>'));
            if (i == 2) {
                text = text.replace(/<dt>\s*(<span[^>]*>)?\s*([^<\s]*)\s*(<\/span>)?\s*<\/dt>/g, "<index>$2</index>")
                    .replace(/<span class="move">\s*([^<\s]*)\s*<\/span>/g, "<move>$1</move>")
            } else {
                text = text.replace(/<interrupt>((?!<\/interrupt>).)*<\/interrupt>/g, "")
                    .replace(/<(move|m1|m2)[^<>"]*(("[^"]*")[^<>"]*)*>/g, "<move>").replace(/<\/(m1|m2)>/g, "</move>")
                    .replace(/<\/?san>|<eval>[^<]*<\/eval>|<glyph[^<]*<\/glyph>|<move>\.\.\.<\/move>/g, "")
                    .replace(/\?/g, "x");
            }
            text = ntext + text
                .replace(/{|}/g, "")
                .replace(/(<index[^>]*>)/g, "{").replace(/<\/index>/g, ".}")
                .replace(/<move>/g, "{").replace(/<\/move>/g, " }")
                .replace(/(^|})[^{]*($|{)/g, "");
        }
    }
    if (text.split("/").length == 8 && text.split(".").length == 1) {
        pos = parseFEN(text);
        setCurFEN(generateFEN(pos));
        _history = [
            [getCurFEN()]
        ];
        _historyindex = 0;
        historyMove(0);
    } else if (text.split(".").length > 1) {
        var whitename = null,
            blackname = null;
        var wi = text.indexOf("[White \""),
            bi = text.indexOf("[Black \"");
        if (wi >= 0 && bi > wi) {
            var wil = text.substr(wi + 8).indexOf("\"]"),
                bil = text.substr(bi + 8).indexOf("\"]");
            if (wil > 0 && wil < 128) whitename = text.substr(wi + 8, wil);
            if (bil > 0 && bil < 128) blackname = text.substr(bi + 8, bil);
        }

        text = text.replace(/\u2605/g, "").replace(/\u0445/g, "x");
        text = " " + text.replace(/\./g, " ").replace(/(\[FEN [^\]]+\])+?/g, function($0, $1) {
            return $1.replace(/\[|\]|"/g, "").replace(/\s/g, ".");
        });
        text = text.replace(/\[Event /g, "* [Event ").replace(/\s(\[[^\]]+\])+?/g, "").replace(/(\{[^\}]+\})+?/g, "");
        var r = /(\([^\(\)]+\))+?/g;
        while (r.test(text)) text = text.replace(r, "");
        text = text.replace(/0-0-0/g, "O-O-O").replace(/0-0/g, "O-O").replace(/(1\-0|0\-1|1\/2\-1\/2)/g, " * ")
            .replace(/\s\d+/g, " ").replace(/\$\d+/g, "").replace(/\?/g, "");
        var moves = text.replace(/\s/g, " ").replace(/ +/g, " ").trim().split(' ');
        var pos = parseFEN(START);
        var oldhistory = JSON.parse(JSON.stringify(_history));
        _history = [
            [START]
        ];
        _historyindex = 0;
        gm = 0;
        for (var i = 0; i < moves.length; i++) {
            if (moves[i].length == 0) continue;
            if ("*".indexOf(moves[i][0]) == 0) {
                if (i < moves.length - 1) {
                    pos = parseFEN(START);
                    historyAdd(generateFEN(pos), oldhistory);
                    gm++;
                }
                continue;
            } else if (moves[i].indexOf("FEN.") == 0) {
                pos = parseFEN(moves[i].substring(4).replace(/\./g, " "));
                if (_history[_historyindex][0] == START) _historyindex--;
                historyAdd(generateFEN(pos), oldhistory);
                continue;
            }
            if (moves[i] == "--") {
                pos.w = !pos.w;
                historyAdd(generateFEN(pos), oldhistory);
                continue;
            }
            var move = parseMove(pos, moves[i]);
            if (move == null) {
                alert("incorrect move: " + moves[i] + " " + gm);
                break;
            }
            var san = sanMove(pos, move, genMoves(pos));
            pos = doMove(pos, move.from, move.to, move.p);
            historyAdd(generateFEN(pos), oldhistory, move, san);
        }
        setCurFEN(generateFEN(pos));
        historyKeep(whitename, blackname);
    } else if (text.toLowerCase() == "reset") {
        setCurFEN(START);
        _history = [
            [getCurFEN()]
        ];
        _historyindex = 0;
        historyKeep();
        _history2 = null;
        if (_nncache != null) _nncache.clear();
    } else if (text.toLowerCase() == "clear") {
        setCurFEN("8/8/8/8/8/8/8/8 w - - 0 0");
        showBoard();
        historySave();
    } else if (text.toLowerCase() == "colorflip") {
        setCurFEN(generateFEN(colorflip(parseFEN(getCurFEN()))));
        showBoard();
        historySave();
    } else if (text.toLowerCase() == "sidetomove") {
        setCurFEN(getCurFEN().replace(" w ", " ! ").replace(" b ", " w ").replace(" ! ", " b "));
        showBoard();
        historySave();
        
    } else if (text.toLowerCase() == "sidetomove2") {
        _isPlayerWhite = _isPlayerWhite ? false : true;
        showBoard();
        historySave();

    } else if (text.toLowerCase().indexOf("depth ") == 0) {
        if (_engine != null && _engine.ready) {
            _engine.depth = Math.min(128, Math.max(0, parseInt(text.toLowerCase().replace("depth ", ""))));
            if (isNaN(_engine.depth)) _engine.depth = 15;
        }
        showBoard();
        historySave();
    } else if (text.toLowerCase() == "flip") {
        doFlip();
    } else if (text.toLowerCase() == "window") {

        var encoded = "";
        if (_history[0][0] == START) {
            var gi = "";
            for (var i = 1; i < _history.length; i++) {
                var pos = parseFEN(_history[i - 1][0]);
                var moves = genMoves(pos);
                var mindex = -1;
                for (var j = 0; j < moves.length; j++) {
                    var move = moves[j];
                    var pos2 = doMove(pos, move.from, move.to, move.p);
                    if (generateFEN(pos2) == _history[i][0]) mindex = j;
                }
                if (mindex < 0) {
                    gi = "";
                    break;
                }
                var symbols = (moves.length + 1).toString(2).length,
                    v = "";
                for (var j = 0; j < symbols; j++) v += "0";
                var n = (mindex + 1).toString(2);
                n = v.substr(n.length) + n;
                gi += n;
                if (i == _history.length - 1) gi += v;
            }
            var cur = "";
            for (var i = 0; i < gi.length; i++) {
                cur += gi[i];
                if (i == gi.length - 1)
                    while (cur.length < 6) cur += "0";
                if (cur.length == 6) {
                    encoded += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_" [parseInt(cur, 2)];
                    cur = "";
                }
            }
        }
        var wb = document.getElementById("wb").children;
        var lparams = [];
        for (var i = 0; i < wb.length; i++) {
            if (wb[i].tagName != 'DIV') continue;
            var winId = wb[i].id.substring(2);
            var elem = document.getElementById("w" + winId);
            if (elem.style.display == "none") continue;
            if (elem.style.position == "absolute" && !_mobile) {
                lparams.push((winId[0] + elem.style.width + "," + elem.style.height + "," + elem.style.left + "," + elem.style.top).replace(/px/g, ""));
            } else if ((elem.style.width != elem.originalWidth || elem.style.height != elem.originalHeight) && !_mobile) {
                lparams.push((winId[0] + elem.style.width + "," + elem.style.height).replace(/(\.[0-9]+)?px/g, ""));
            } else lparams.push(winId[0]);
        }
        var lparamsstr = lparams.join(" ").toLowerCase();
        var url = [location.protocol, '//', location.host, location.pathname].join('');
        var params = [];
        if (_color > 0) params.push("col" + _color);
        if (_engine != null && _engine.ready && _engine.depth != 15) params.push("depth " + _engine.depth);
        if (lparamsstr != "c m h g") params.push("layout " + (lparamsstr.length == 0 ? "-" : lparamsstr));
        if (encoded.length > 0) params.push("~" + encoded);
        else if (getCurFEN() != START) params.push(getCurFEN());
        for (var i = 0; i < params.length; i++) {
            url += (i == 0 ? "?" : "&") + String.fromCharCode("a".charCodeAt(0) + i) + "=" + params[i];
        }
        window.open(url, "_blank");

    } else if (text[0] == "~") {
        var pos = parseFEN(START);
        var oldhistory = JSON.parse(JSON.stringify(_history));
        _history = [
            [START]
        ];
        _historyindex = 0;
        var gi = "";
        for (var i = 1; i < text.length; i++) {
            var n = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".indexOf(text[i]).toString(2);
            gi += "000000".substr(n.length) + n;
        }
        var i = 0;
        while (i < gi.length) {
            var moves = genMoves(pos);
            var symbols = (moves.length + 1).toString(2).length,
                cur = "";
            for (var j = 0; j < symbols; j++) {
                cur += (i < gi.length ? gi[i] : "0");
                i++;
            }
            var n = parseInt(cur, 2);
            if (n == 0 || n >= moves.length + 1) break;
            var move = moves[n - 1],
                san = sanMove(pos, move, moves);
            pos = doMove(pos, move.from, move.to, move.p);
            historyAdd(generateFEN(pos), oldhistory, move, san);
        }
        setCurFEN(generateFEN(pos));
        historyKeep();
    } else if (text.toLowerCase() == "revert") {
        if (_history2 != null) {
            _historyindex = _history2[0];
            _history = _history2[1];
            _history2 = null;
            setCurFEN(_history[_historyindex][0]);
            refreshButtonRevert();
            historyMove(0);
        }
    } else if (text.toLowerCase() == "keep") {
        historyKeep(_wname, _bname);
    } else if (text.length == 4 && text.toLowerCase().indexOf("col") == 0) {
        setBoardColor(Math.max(0, text.charCodeAt(3) - "0".charCodeAt(0)));
    } else if (text.toLowerCase().indexOf("layout ") == 0) {
        var a = text.toUpperCase().split(" ");
        a.splice(0, 1);
        var wb = document.getElementById("wb").children;
        for (var i = 0; i < wb.length; i++) {
            if (wb[i].tagName != 'DIV') continue;
            var winId = wb[i].id.substring(2);
            var cur = a.find(function(x) {
                return x[0] == winId[0];
            });
            if (cur != null && !_mobile) {
                cur = cur.substring(1);
                var b = cur.length == 0 ? [] : cur.split(",");
                var elem = document.getElementById("w" + winId);
                if (elem.firstElementChild.ondblclick != null) elem.firstElementChild.ondblclick();
                if (b.length >= 2) {
                    elem.style.width = b[0] + "px";
                    elem.style.height = b[1] + "px";
                }
                if (b.length >= 4) {
                    elem.style.left = b[2] + "px";
                    elem.style.top = b[3] + "px";
                    elem.style.position = "absolute";
                }
                showHideWindow(winId, true);
            } else if (cur != null && _mobile) showHideWindow(winId, true);
            else if (!_mobile) showHideWindow(winId, false);
        }
    } else {
        for (var i = 0; i < _curmoves.length; i++)
            if (_curmoves[i].san == text) {
                doMoveHandler(_curmoves[i].move);
                break;
            }
    }
}

function dosearch() {
    var text = document.getElementById('searchInput').value;
    document.getElementById('searchInput').value = getCurFEN();
    command(text);
    document.getElementById('searchInput').value = getCurFEN();
    document.getElementById('searchInput').blur();
}

function showHideButtonGo(state) {
    if (!document.getElementById('searchInput').focus) state = false;
    if (state && document.getElementById('searchInput').value == getCurFEN()) state = false;
    document.getElementById("buttonGo").style.display = state ? "" : "none";
}

function setupInput() {
    document.getElementById("buttonGo").onclick = function() {
        dosearch();
    };
    document.getElementById("buttonGo").onmousedown = function(event) {
        event.preventDefault();
    };
    var input = document.getElementById("searchInput");
    input.onmousedown = function() {
        this.focuswithmouse = 1;
    };
    input.onmouseup = function() {
        if (this.focuswithmouse == 2 && input.selectionStart == input.selectionEnd) this.select();
        this.focuswithmouse = 0;
    }
    input.onfocus = function() {
        if (this.focuswithmouse == 1) this.focuswithmouse = 2;
        else {
            input.select();
            this.focuswithmouse = 0;
        }
        showHideButtonGo(true);
        document.onkeydown = null;
    };
    input.onblur = function() {
        input.selectionStart = input.selectionEnd;
        showHideButtonGo(false);
        document.onkeydown = onKeyDown;
        this.focuswithmouse = 0;
    };
    input.onpaste = function() {
        window.setTimeout(function() {
            showHideButtonGo(true);
        }, 1);
    };
    input.onkeydown = function(e) {
        if (e.keyCode == 27) e.preventDefault();
        window.setTimeout(function() {
            showHideButtonGo(true);
        }, 1);
    };
    input.onkeyup = function(e) {
        if (e.keyCode == 27) {
            input.value = getCurFEN();
            this.select();
            showHideButtonGo(true);
        }
    };
    document.getElementById("simpleSearch").onsubmit = function() {
        dosearch();
        return false;
    };
}

// Tooltip

function getClientY(e) {
    if (!_mobile) return e.clientY;
    var scrollOffset = (window.pageYOffset || document.documentElement.scrollTop) - (document.documentElement.clientTop || 0);
    return (e.clientY + scrollOffset) * _bodyScale;
}

function updateTooltipPos(e) {
    var tooltip = document.getElementById("tooltip");
    tooltip.style.left = (e.clientX * _bodyScale) + "px";
    tooltip.style.top = (getClientY(e) + 20) + "px";
}

function updateTooltip(text, answerpv, movenumber, cl, e) {
    var state = text.length > 0;
    var tooltip = document.getElementById("tooltip");
    while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);
    var span1 = document.createElement('span');
    setElemText(span1, state ? text : "")
    if (movenumber != null) {
        var span2 = document.createElement('span');
        span2.style.color = "#64c4db";
        setElemText(span2, movenumber + " ")
        tooltip.appendChild(span2);
    }
    if (cl != null && cl != "circle") {
        var span3 = document.createElement('span');
        span3.className = cl;
        tooltip.appendChild(span3);
        span1.style.paddingLeft = "12px";
    }
    tooltip.appendChild(span1);

    _tooltipState = state;
    tooltip.style.display = state ? "" : "none";
    if (e != null) updateTooltipPos(e);

    if (answerpv != null && answerpv.length > 0 && (answerpv[0].length == 4 || answerpv[0].length == 5)) {
        for (var i = 0; i < Math.min(answerpv.length, _movesPv ? 5 : 1); i++) {
            var move = {
                from: {
                    x: "abcdefgh".indexOf(answerpv[i][0]),
                    y: "87654321".indexOf(answerpv[i][1])
                },
                to: {
                    x: "abcdefgh".indexOf(answerpv[i][2]),
                    y: "87654321".indexOf(answerpv[i][3])
                }
            };
            showArrow1(move, 1 - (i / 5));
        }
    } else setArrow(_arrow);
}

// Chessboard and arrows

function getEvalText(e, s) {
    if (e == null) return s ? "" : "?";
    var matein = Math.abs(Math.abs(e) - 1000000);
    if (Math.abs(e) > 900000) {
        if (s) return (e > 0 ? "+M" : "-M") + matein;
        else return (e > 0 ? "white mate in " : "black mate in ") + matein;
    }
    return (e / 100).toFixed(2);
}

function showLegalMoves(from) {
    setArrow(from == null);
    var pos = parseFEN(getCurFEN());
    var elem = document.getElementById('chessboard1');
    for (var i = 0; i < elem.children.length; i++) {
        var div = elem.children[i];
        if (div.tagName != 'DIV') continue;
        if (div.style.zIndex > 0) continue;
        var x = parseInt(div.style.left.replace("px", "")) / 40;
        var y = parseInt(div.style.top.replace("px", "")) / 40;
        if (_flip) {
            x = 7 - x;
            y = 7 - y;
        }
        var c = div.className.split(' ')[0] + " " + div.className.split(' ')[1];
        if (div.className.indexOf(" h2") >= 0) c += " h2";
        div.className = c;
        div.onmouseover = null;
        setElemText(div, "");
        if (from == null || from.x < 0 || from.y < 0) continue;
        if (from.x == x && from.y == y) {
            div.className += " h0";
            _clickFromElem = div;
        } else if (isLegal(pos, from, {
                x: x,
                y: y
            })) {
            if (_curmoves.length == 0) continue;
            var text = "",
                san = "",
                answerpv = null,
                cl = null;
            for (var j = 0; j < _curmoves.length; j++) {
                if (_curmoves[j].move.from.x == from.x && _curmoves[j].move.from.y == from.y &&
                    _curmoves[j].move.to.x == x && _curmoves[j].move.to.y == y &&
                    (_curmoves[j].move.p == 'Q' || _curmoves[j].move.p == null)) {
                    text = getEvalText(_curmoves[j].eval, true);
                    san = _curmoves[j].san;
                    answerpv = _curmoves[j].answerpv;
                    cl = getCircleClassName(j);
                    break;
                }
            }
            div.className += " h1";
            setElemText(div, text);
            div.tooltip = san + (text.length > 0 ? " " + text : "");
            div.answerpv = answerpv == null ? [] : answerpv;
            div.cl = cl == null ? "circle" : cl;
            div.onmouseover = function(e) {
                updateTooltip(this.tooltip, this.answerpv, null, this.cl, e);
            };
            div.onmouseout = function() {
                updateTooltip("");
            };
        }
        updateTooltip("");
    }

    elem = document.getElementById('editWrapper').children[0];
    for (var i = 0; i < elem.children.length; i++) {
        var div = elem.children[i];
        if (div.tagName != 'DIV') continue;
        if (div.style.zIndex > 0) continue;
        var x = -parseInt(div.style.left.replace("px", "")) / 40 - 1;
        var y = -parseInt(div.style.top.replace("px", "")) / 40 - 1;
        var c = div.className.split(' ')[0] + " " + div.className.split(' ')[1];
        div.className = c;
        setElemText(div, "");
        if (from == null || from.x >= 0 || from.y >= 0) continue;
        if (from.x == x && from.y == y) {
            div.className += " h0";
            _clickFromElem = div;
        }
    }
    showArrow3(null);

    _clickFrom = from;
}

function updateLegalMoves() {
    var pos = parseFEN(getCurFEN());
    var elem = document.getElementById('chessboard1');
    for (var i = 0; i < elem.children.length; i++) {
        var div = elem.children[i];
        if (div.tagName != 'DIV' || div.style.zIndex > 0 || div.className.indexOf(" h1") < 0 || div.cl != "circle") continue;
        var x = parseInt(div.style.left.replace("px", "")) / 40;
        var y = parseInt(div.style.top.replace("px", "")) / 40;
        if (_flip) {
            x = 7 - x;
            y = 7 - y;
        }
        var c = div.className.split(' ')[0] + " " + div.className.split(' ')[1];
        if (div.className.indexOf(" h2") >= 0) c += " h2";
        for (var j = 0; j < _curmoves.length; j++) {
            if (div.tooltip == _curmoves[j].san) {
                var text = getEvalText(_curmoves[j].eval, true);
                var san = _curmoves[j].san;
                var answerpv = _curmoves[j].answerpv;
                var cl = getCircleClassName(j);
                setElemText(div, text);
                div.tooltip = san + (text.length > 0 ? " " + text : "");
                div.answerpv = answerpv == null ? [] : answerpv;
                div.cl = cl == null ? "circle" : cl;
                div.onmouseover = function(e) {
                    updateTooltip(this.tooltip, this.answerpv, null, this.cl, e);
                };
                div.onmouseout = function() {
                    updateTooltip("");
                };
                if (_tooltipState && getElemText(document.getElementById("tooltip").firstChild) == _curmoves[j].san) updateTooltip(div.tooltip, div.answerpv, null, div.cl, null);
                break;
            }
        }
    }
}

function setArrow(state) {
    _arrow = state;
    if (_arrow && _curmoves.length > 0 && _curmoves[0].eval != null) showArrow1(_curmoves[0].move);
    else showArrow1();
}

function repaintLastMoveArrow() {
    var lastmove = (getCurFEN() == _history[_historyindex][0] && _history[_historyindex].length > 2) ? _history[_historyindex][2] : null;
    if (lastmove != null) {
        var elem = document.getElementById("arrowWrapper2");
        if (elem.children[0].children != null)
            elem.children[0].children[0].children[0].children[0].style.fill = elem.children[0].children[1].style.stroke = getGraphPointColor(_historyindex);
    }
    showArrow2(lastmove);
}

function scrollReset(winId) {
    var windowElem = document.getElementById("w" + winId);
    var scrollElem = document.getElementById(winId.toLowerCase());
    var oldDisplay = windowElem.style.display;
    windowElem.style.display = "";
    scrollElem.scrollTop = 0;
    windowElem.style.display = oldDisplay;
}

function showBoard(noeval, refreshhistory, keepcontent) {
    var pos = parseFEN(getCurFEN());
    var dragElem = document.getElementById('dragPiece');
    while (dragElem.firstChild) dragElem.removeChild(dragElem.firstChild);
    var elem = document.getElementById('chessboard1');
    if (keepcontent && elem.children.length != 64) keepcontent = false;
    if (!keepcontent)
        while (elem.firstChild) elem.removeChild(elem.firstChild);
    var index = 0;
    for (var x = 0; x < 8; x++)
        for (var y = 0; y < 8; y++) {
            var div = keepcontent ? elem.children[index] : document.createElement('div');
            index++;
            div.style.left = (_flip ? 7 - x : x) * 40 + "px";
            div.style.top = (_flip ? 7 - y : y) * 40 + "px";
            div.className = ((x + y) % 2 ? "d" : "l");
            div.className += " " + pos.b[x][y];
            if (pos.b[x][y] == "K" && isWhiteCheck(pos) ||
                pos.b[x][y] == "k" && isWhiteCheck(colorflip(pos))) div.className += " h2";
            if (!keepcontent) elem.appendChild(div);
        }
    if (_clickFromElem != null && _clickFrom != null && _clickFrom.x >= 0 && _clickFrom.y >= 0) _clickFromElem = null;
    document.getElementById('searchInput').value = getCurFEN();

    if (!noeval) {
        refreshMoves();
        if (refreshhistory)
            for (var i = 0; i < _history.length; i++)
                if (_history[i].length > 1 && _history[i][1] != null) _history[i][1].depth = -1;
        scrollReset("Moves");
        scrollReset("Opening");
        scrollReset("Static");
        if (_engine && !_engine.kill) evalAll();

    }
    document.getElementById('buttonStm').className = pos.w ? "white" : "black";

    setArrow(true);
    repaintLastMoveArrow();
    showArrow3(null);

    if (_menu) reloadMenu();
    repaintGraph();
    repaintSidebars();
    updateInfo();
    repaintStatic();
    repaintLczero();
    updateTooltip("");
}

function findMoveIndexBySan(san) {
    for (var i = 0; i < _curmoves.length; i++)
        if (san == _curmoves[i].san) return i;
    return null;
}

function highlightMove(index, state) {
    setArrow(!state);
    if (_dragElement != null) return;
    var elem = document.getElementById('chessboard1');
    var x1 = _curmoves[index].move.from.x;
    var y1 = _curmoves[index].move.from.y;
    var x2 = _curmoves[index].move.to.x;
    var y2 = _curmoves[index].move.to.y;
    var text = getEvalText(_curmoves[index].eval, true);
    for (var i = 0; i < elem.children.length; i++) {
        var div = elem.children[i];
        if (div.tagName != 'DIV') continue;
        if (div.style.zIndex > 0) continue;
        var x = parseInt(div.style.left.replace("px", "")) / 40;
        var y = parseInt(div.style.top.replace("px", "")) / 40;
        if (_flip) {
            x = 7 - x;
            y = 7 - y;
        }
        var c = div.className.split(' ')[0] + " " + div.className.split(' ')[1];
        setElemText(div, "");
        if (div.className.indexOf(" h2") >= 0) c += " h2";
        if (state && x1 == x && y1 == y) div.className = c + " h0";
        else if (state && x2 == x && y2 == y) {
            div.className = c + " h1";
            setElemText(div, text);
        } else div.className = c;
        div.onmouseover = null;
    }
    if (state) updateTooltip("", _curmoves[index].answerpv);
    else updateTooltip("");
}

function showArrowInternal(move, wrapperId, opacity = 1) {
    var elem = document.getElementById(wrapperId);
    if (move == null) {
        elem.style.display = "none";
        return;
    }
    if (elem.children[0].children == null) return;
    var line = elem.children[0].children[1];
    line.setAttribute('x1', 20 + (_flip ? 7 - move.from.x : move.from.x) * 40);
    line.setAttribute('y1', 20 + (_flip ? 7 - move.from.y : move.from.y) * 40);
    line.setAttribute('x2', 20 + (_flip ? 7 - move.to.x : move.to.x) * 40);
    line.setAttribute('y2', 20 + (_flip ? 7 - move.to.y : move.to.y) * 40);
    line.style.opacity = opacity.toFixed(2);
    elem.style.display = "block";

}

function showArrow1(move, opacity) {
    var elem = document.getElementById("arrowWrapper1");
    var elem0 = elem.children[0];
    if (opacity == null || opacity == 1)
        for (var i = elem0.children.length - 1; i >= 2; i--) elem0.removeChild(elem0.children[i]);
    else elem.children[0].appendChild(elem0.children[1].cloneNode(false));
    showArrowInternal(move, "arrowWrapper1", opacity);
}

function showArrow2(move) {
    showArrowInternal(move, "arrowWrapper2");
}

function showArrow3(move) {
    var elem0 = document.getElementById("arrowWrapper3").children[0];
    if (elem0.children == null) return;
    if (move == null) {
        for (var i = elem0.children.length - 1; i >= 2; i--) elem0.removeChild(elem0.children[i]);
    } else if (move.from.x == move.to.x && move.from.y == move.to.y || !bounds(move.from.x, move.from.y) || !bounds(move.to.x, move.to.y)) {
        elem0.children[1].style.display = "none";
    } else {
        elem0.children[1].style.display = "";
    }
    showArrowInternal(move, "arrowWrapper3");
}

function finalArrow3() {
    var elem = document.getElementById("arrowWrapper3");
    var list = elem.children[0].children,
        remElem = null;
    if (list == null) return;
    if (list[1].style.display == "none") return;
    for (var i = 2; i < list.length; i++) {
        if (list[i].getAttribute("x1") == list[1].getAttribute("x1") &&
            list[i].getAttribute("y1") == list[1].getAttribute("y1") &&
            list[i].getAttribute("x2") == list[1].getAttribute("x2") &&
            list[i].getAttribute("y2") == list[1].getAttribute("y2")) remElem = list[i];
    }
    if (remElem == null) {
        elem.children[0].appendChild(list[1].cloneNode(false));
    } else {
        elem.children[0].removeChild(remElem);
    }
    list[1].style.display = "none";
}

function updateInfo() {
    var curfen = getCurFEN();
    var pos = parseFEN(curfen);
    var curpos = pos.m[1];
    var positionInfoText = "Position: " + (_historyindex + 1) + " of " + _history.length + " - Last Move: ";
    if (_history[_historyindex].length > 3 && _history[_historyindex][3] != null) {
        var pos2 = parseFEN(_history[_historyindex][0]);
        positionInfoText += (pos2.w ? (pos2.m[1] - 1) + "... " : pos2.m[1] + ". ") + _history[_historyindex][3];
    } else positionInfoText += "-";
    if (_historyindex>6){
        document.getElementById("wOpening").style.height = "115px";
        document.getElementById("wHistory").style.height = "145px";
    } else {
        document.getElementById("wOpening").style.height = "185px";
        document.getElementById("wHistory").style.height = "105px";
    }
    var movesInfoText = (pos.w ? "White" : "Black") + " To Play (" + _curmoves.length + " Legal Move" + (_curmoves.length == 1 ? "" : "s") + ")";
    setElemText(document.getElementById('positionInfo'), positionInfoText);
    setElemText(document.getElementById('movesInfo'), movesInfoText);

    // History window
    var elem = document.getElementById("history"),
        movesText = "";
    while (elem.firstChild) elem.removeChild(elem.firstChild);
    var div = document.createElement('div');
    var lastmn = null,
        mn = null;
    for (var i = 0; i < _history.length; i++) {
        if (mn != lastmn) {
            var span1 = document.createElement('span');
            setElemText(span1, mn + ". ");
            span1.style.color = "#64c4db";
            div.appendChild(span1);
            if (i <= _historyindex) movesText += mn + ".";
            lastmn = mn;
        }
        var mn = parseMoveNumber(_history[i][0]);
        var san = '\u2605';
        if (_history[i].length > 3 && _history[i][3] != null) san = _history[i][3];
        var span2 = document.createElement('span');
        setElemText(span2, san);
        span2.className = "movelink" + (i == _historyindex ? " selected" : "");
        span2.targetindex = i;
        var c = getGraphPointColor(i);
        if (c != "#008800") span2.style.borderBottomColor = c;
        span2.onclick = function() {
            var i = this.targetindex;
            if (i < _history.length && i >= 0 && i != _historyindex) {
                historyMove(i - _historyindex);
            }
        }
        div.appendChild(span2);
        div.appendChild(document.createTextNode(" "));
        if (i > 0 && i <= _historyindex) movesText += san + " ";
    }
    elem.appendChild(div);

    
    // Opening window
    elem = document.getElementById("opening");
    while (elem.firstChild) elem.removeChild(elem.firstChild);
    var list = [],
        lengthMatch = 0,
        indexMatch = -1;
    for (var i = 0; i < _open.length; i++) {
        if (movesText.indexOf(_open[i][2]) == 0 && _open[i][2].length > lengthMatch) {
            indexMatch = i;
            lengthMatch = _open[i][2].length;
        }
    }
    if (indexMatch >= 0) {
        list.push({
            name: _open[indexMatch][0] + " " + _open[indexMatch][1],
            score: _open[indexMatch][3] + "%",
            popularity: (_open[indexMatch][4] / 100).toFixed(2) + "%",
            moves: _open[indexMatch][2]
        });
    }
    for (var i = 0; i < _open.length; i++) {
        if ((movesText.length > 0 || _history[0][0] == START) && _open[i][2].indexOf(movesText) == 0 && list.length < 64) {
            list.push({
                name: _open[i][0] + " " + _open[i][1],
                score: _open[i][3] + "%",
                popularity: (_open[i][4] / 100).toFixed(2) + "%",
                moves: _open[i][2]
            });
        }
    }
    for (var i = 0; i < list.length; i++) {
        var node1 = document.createElement("DIV");
        node1.className = "line";
        var node2 = document.createElement("SPAN");
        node2.className = "name";
        node2.appendChild(document.createTextNode(list[i].name));
        node2.title = list[i].name;
        var node3 = document.createElement("SPAN");
        node3.className = "score";
        node3.appendChild(document.createTextNode(list[i].score));
        var node4 = document.createElement("SPAN");
        node4.className = "popularity";
        node4.appendChild(document.createTextNode(list[i].popularity));
        var node5 = document.createElement("SPAN");
        node5.className = "moves";
        node5.appendChild(document.createTextNode(list[i].moves));
        node5.title = list[i].moves;
        node1.appendChild(node2);
        node1.appendChild(node3);
        node1.appendChild(node4);
        node1.appendChild(node5);
        if (indexMatch >= 0 && i == 0) {
            node1.style.color = "#64c4db";
            node1.targetindex = list[i].moves.split(" ").length;
            node1.onclick = function() {
                var i = this.targetindex;
                if (i < _history.length && i >= 0 && i != _historyindex) historyMove(i - _historyindex);
            }
        } else {
            node1.targetmoves = list[i].moves;
            node1.onclick = function() {
                var savedhistory = _history2 == null ? [_historyindex, JSON.parse(JSON.stringify(_history))] : _history2;
                command(this.targetmoves);
                _history2 = savedhistory;
                refreshButtonRevert();
            }
        }
        elem.appendChild(node1);
    }

    // Games window
    elem = document.getElementById("games");
    while (elem.firstChild) elem.removeChild(elem.firstChild);
    var list = [],
        lengthMatch = 0,
        indexMatch = -1;
    for (var i = 0; i < _game.length; i++) {
        if (movesText.indexOf(_game[i][3]) == 0 && _game[i][3].length > lengthMatch) {
            indexMatch = i;
            lengthMatch = _game[i][3].length;
        }
    }
    if (indexMatch >= 0) {
        list.push({
            name: _game[indexMatch][0] + " " + _game[indexMatch][1],
            score: _game[indexMatch][2],
            popularity: _game[indexMatch][4],
            moves: _game[indexMatch][3]
        });
    }
    for (var i = 0; i < _game.length; i++) {
        if ((movesText.length > 0 || _history[0][0] == START) && _game[i][4].indexOf(movesText) == 0 && list.length < 64) {
            list.push({
                name: _game[i][0] + " " + _game[i][1],
                score: _game[i][2],
                popularity: _game[i][4],
                moves: _game[i][3]
            });
        }
    }
    for (var i = 0; i < list.length; i++) {
        var node1 = document.createElement("DIV");
        node1.className = "line";
        var node2 = document.createElement("SPAN");
        node2.className = "name";
        node2.appendChild(document.createTextNode(list[i].name));
        node2.title = list[i].name;
        var node3 = document.createElement("SPAN");
        node3.className = "score";
        node3.appendChild(document.createTextNode(list[i].score));
        var node4 = document.createElement("SPAN");
        node4.className = "popularity";
        node4.appendChild(document.createTextNode(list[i].popularity));
        var node5 = document.createElement("SPAN");
        node5.className = "moves";
        node5.appendChild(document.createTextNode(list[i].moves));
        node5.title = list[i].moves;
        node1.appendChild(node2);
        node1.appendChild(node3);
        node1.appendChild(node4);
        node1.appendChild(node5);
        if (indexMatch >= 0 && i == 0) {
            node1.style.color = "#64c4db";
            node1.targetindex = list[i].moves.split(" ").length;
            node1.onclick = function() {
                var i = this.targetindex;
                if (i < _history.length && i >= 0 && i != _historyindex) historyMove(i - _historyindex);
            }
        } else {
            node1.targetmoves = list[i].moves;
            node1.onclick = function() {
                var savedhistory = _history2 == null ? [_historyindex, JSON.parse(JSON.stringify(_history))] : _history2;
                command(this.targetmoves);
                _history2 = savedhistory;
                refreshButtonRevert();
            }
        }
        elem.appendChild(node1);
    }

    // Puzzle window
    elem = document.getElementById("puzzles");
    while (elem.firstChild) elem.removeChild(elem.firstChild);
    var list = [],
        lengthMatch = 0,
        indexMatch = -1;
    if (indexMatch >= 0) {
        list.push({
            name: _puzzle[indexMatch][1] + " " + _puzzle[indexMatch][1],
        });
    }
    for (var i = 0; i < _puzzle.length; i++) {
        list.push({
            score: i,
            name: _puzzle[i][0],
            popularity: _puzzle[i][1]
        });
    }
    for (var i = 0; i < list.length; i++) {
        var node1 = document.createElement("DIV");
        node1.className = "line";
        var node2 = document.createElement("SPAN");
        node2.className = "name";
        node2.appendChild(document.createTextNode(list[i].name));
        node2.title = list[i].name;
        var node3 = document.createElement("SPAN");
        node3.className = "score";
        node3.appendChild(document.createTextNode(list[i].score));
        var node4 = document.createElement("SPAN");
        node4.className = "popularity";
        node4.appendChild(document.createTextNode(list[i].popularity));
        var node5 = document.createElement("SPAN");
        node5.title = list[i].moves;
        node1.appendChild(node2);
        node1.appendChild(node3);
        node1.appendChild(node4);
        node2.onclick = function() {
            var savedhistory = _history2 == null ? [_historyindex, JSON.parse(JSON.stringify(_history))] : _history2;
            command(this.title + " w - - 0 1");
            _history2 = savedhistory;
            refreshButtonRevert();
            menuPlayEngineWhite();
            
        // if (i < _history.length && i >= 0 && i != _historyindex) historyMove(i - _historyindex);
        }
        elem.appendChild(node1);
        
         // var _history = [
        //     [node1]
        // ],
        // _history2 = null,
        // _historyindex = 0;
        // if (indexMatch >= 0 && i == 0) {

        //     node1.style.color = "#64c4db";
        //     node1.targetindex = list[i].moves.split(" ").length;
        //     node1.onclick = function() {
        //         var i = this.targetindex;
        //         if (i < _history.length && i >= 0 && i != _historyindex) historyMove(i - _historyindex);
        //     }
        // } else {
        //     node1.targetmoves = list[i].moves;
        //     node1.onclick = function() {
        //         var savedhistory = _history2 == null ? [_historyindex, JSON.parse(JSON.stringify(_history))] : _history2;
        //         command(this.targetmoves);
        //         _history2 = savedhistory;
        //         
        //     }
        // }
    }
   

    // Traping window
    elem = document.getElementById("traping");
    while (elem.firstChild) elem.removeChild(elem.firstChild);
    var list = [],
        lengthMatch = 0,
        indexMatch = -1;
    for (var i = 0; i < _trap.length; i++) {
        if (movesText.indexOf(_trap[i][2]) == 0 && _trap[i][2].length > lengthMatch) {
            indexMatch = i;
            lengthMatch = _trap[i][2].length;
        }
    }
    if (indexMatch >= 0) {
        list.push({
            name: _trap[indexMatch][0] + " " + _trap[indexMatch][1],
            score: _trap[indexMatch][3] + "%",
            popularity: (_trap[indexMatch][4] / 100).toFixed(2) + "%",
            moves: _trap[indexMatch][2]
        });
    }
    for (var i = 0; i < _trap.length; i++) {
        if ((movesText.length > 0 || _history[0][0] == START) && _trap[i][2].indexOf(movesText) == 0 && list.length < 64) {
            list.push({
                name: _trap[i][0] + " " + _trap[i][1],
                score: _trap[i][3] + "%",
                popularity: (_trap[i][4] / 100).toFixed(2) + "%",
                moves: _trap[i][2]
            });
        }
    }
    for (var i = 0; i < list.length; i++) {
        var node1 = document.createElement("DIV");
        node1.className = "line";
        var node2 = document.createElement("SPAN");
        node2.className = "name";
        node2.appendChild(document.createTextNode(list[i].name));
        node2.title = list[i].name;
        var node3 = document.createElement("SPAN");
        node3.className = "score";
        node3.appendChild(document.createTextNode(list[i].score));
        var node4 = document.createElement("SPAN");
        node4.className = "popularity";
        node4.appendChild(document.createTextNode(list[i].popularity));
        var node5 = document.createElement("SPAN");
        node5.className = "moves";
        node5.appendChild(document.createTextNode(list[i].moves));
        node5.title = list[i].moves;
        node1.appendChild(node2);
        node1.appendChild(node3);
        node1.appendChild(node4);
        node1.appendChild(node5);
        if (indexMatch >= 0 && i == 0) {
            node1.style.color = "#64c4db";
            node1.targetindex = list[i].moves.split(" ").length;
            node1.onclick = function() {
                var i = this.targetindex;
                if (i < _history.length && i >= 0 && i != _historyindex) historyMove(i - _historyindex);
            }
        } else {
            node1.targetmoves = list[i].moves;
            node1.onclick = function() {
                var savedhistory = _history2 == null ? [_historyindex, JSON.parse(JSON.stringify(_history))] : _history2;
                command(this.targetmoves);
                _history2 = savedhistory;
                refreshButtonRevert();
            }
        }
        elem.appendChild(node1);
    }
}

var _staticSortByChange = false;

function repaintStatic() {
    if (document.getElementById("wStatic").style.display == "none") return;

    var curfen = getCurFEN();
    var pos = parseFEN(curfen);

    // Static evaluation window
    window.setTimeout(function() {
        if (getCurFEN() != curfen) return;
        var elem = document.getElementById("static");
        var evalUnit = 213;
        while (elem.firstChild) elem.removeChild(elem.firstChild);
        var staticEvalListLast = _historyindex > 0 ? getStaticEvalList(parseFEN(_history[_historyindex - 1][0])) : null;
        var staticEvalList = getStaticEvalList(pos),
            total = 0,
            ci = 5;
        for (var i = 0; i < staticEvalList.length; i++) {
            if (i > 0 && staticEvalList[i - 1].group != staticEvalList[i].group) ci++;
            var c1 = 0,
                c2 = 0,
                c3 = 0;
            while (c1 + c2 + c3 == 0) {
                c1 = 22 + (ci % 2) * 216;
                c2 = 22 + (((ci / 2) << 0) % 3) * 108;
                c3 = 22 + ((((ci / 6) << 0)) % 2) * 216;
                if (c1 + c2 + c3 < 100) {
                    c1 = c2 = c3 = 0;
                    ci++;
                }
            }
            staticEvalList[i].bgcol = "rgb(" + c1 + "," + c2 + "," + c3 + ")";
            staticEvalList[i].rel = staticEvalList[i].item[2] - (staticEvalListLast == null ? 0 : staticEvalListLast[i].item[2]);
        }
        var sortArray = [];
        for (var i = 0; i < staticEvalList.length; i++) sortArray.push({
            value: _staticSortByChange ? staticEvalList[i].rel : staticEvalList[i].item[2],
            index: i
        });
        sortArray.sort(function(a, b) {
            return (Math.abs(a.value) < Math.abs(b.value)) ? 1 : Math.abs(a.value) > Math.abs(b.value) ? -1 : 0;
        });
        for (var j = 0; j < sortArray.length; j++) {
            var i = sortArray[j].index;
            total += staticEvalList[i].item[2];
            var text = (staticEvalList[i].item[2] / evalUnit).toFixed(2);
            if (text == "-0.00") text = "0.00";
            var rel = (staticEvalList[i].rel / evalUnit).toFixed(2);
            if (rel == "-0.00") rel = "0.00";
            if (!_staticSortByChange && text == "0.00") continue;
            if (_staticSortByChange && rel == "0.00") continue;

            var node0 = document.createElement("SPAN");
            node0.className = "circle";
            node0.style.backgroundColor = staticEvalList[i].bgcol;

            var node1 = document.createElement("DIV");
            node1.className = "line";
            var node2 = document.createElement("SPAN");
            node2.className = "group";
            node2.appendChild(document.createTextNode(staticEvalList[i].group));
            var node6 = document.createElement("SPAN");
            node6.className = "name";
            node6.appendChild(document.createTextNode(staticEvalList[i].elem[0].toUpperCase() + staticEvalList[i].elem.replace(/\_/g, " ").substring(1)));

            var node3 = document.createElement("SPAN");
            node3.className = "eval";
            if (text.indexOf(".") >= 0) {
                var node4 = document.createElement("SPAN");
                node4.className = "numleft";
                node4.appendChild(document.createTextNode(text.substring(0, text.indexOf(".") + 1)));
                var node5 = document.createElement("SPAN");
                node5.className = "numright";
                node5.appendChild(document.createTextNode(text.substring(text.indexOf(".") + 1)));
                node3.appendChild(node4);
                node3.appendChild(node5);
            } else {
                node3.appendChild(document.createTextNode(text));
            }

            var node7 = document.createElement("SPAN");
            node7.className = "eval rel";
            if (rel.indexOf(".") >= 0) {
                var node8 = document.createElement("SPAN");
                node8.className = "numleft";
                node8.appendChild(document.createTextNode(rel.substring(0, rel.indexOf(".") + 1)));
                var node9 = document.createElement("SPAN");
                node9.className = "numright";
                node9.appendChild(document.createTextNode(rel.substring(rel.indexOf(".") + 1)));
                node7.appendChild(node8);
                node7.appendChild(node9);
            } else {
                node3.appendChild(document.createTextNode(rel));
            }
            node1.appendChild(node0);
            node1.appendChild(node2);
            node1.appendChild(node6);
            node1.appendChild(node3);
            node1.appendChild(node7);
            node1.name = staticEvalList[i].elem.toLowerCase().replace(/ /g, "_");;
            node1.onclick = function() {
                var data = _staticEvalData,
                    sei = null;
                for (var j = 0; j < data.length; j++) {
                    var n = data[j].name.toLowerCase().replace(/ /g, "_");
                    if (n == this.name) sei = data[j];
                }
                if (sei == null) return;
                var func = null,
                    n2 = this.name.toLowerCase().replace(/ /g, "_");
                try {
                    eval("func = $" + n2 + ";");
                } catch (e) {}
                var elem = document.getElementById('chessboard1');
                for (var i = 0; i < elem.children.length; i++) {
                    var div = elem.children[i];
                    if (div.tagName != 'DIV' || div.style.zIndex > 0) continue;
                    var x = parseInt(div.style.left.replace("px", "")) / 40;
                    var y = parseInt(div.style.top.replace("px", "")) / 40;
                    if (_flip) {
                        x = 7 - x;
                        y = 7 - y;
                    }
                    var sqeval = 0;
                    if (n2 == "king_danger") {
                        sqeval = $unsafe_checks(pos, {
                            x: x,
                            y: y
                        });
                        if (sqeval == 0) sqeval = $unsafe_checks(colorflip(pos), {
                            x: x,
                            y: 7 - y
                        });
                        if (sqeval == 0) sqeval = $weak_bonus(pos, {
                            x: x,
                            y: y
                        });
                        if (sqeval == 0) sqeval = $weak_bonus(colorflip(pos), {
                            x: x,
                            y: 7 - y
                        });
                        var showKDarrows = function(p, flipy) {
                            for (var x2 = 0; x2 < 8; x2++)
                                for (var y2 = 0; y2 < 8; y2++) {
                                    if ("PNBRQ".indexOf(board(p, x, y)) < 0) continue;
                                    var s = {
                                            x: x,
                                            y: y
                                        },
                                        s2 = {
                                            x: x2,
                                            y: y2
                                        },
                                        a = false;
                                    if ($king_ring(p, s2)) {
                                        if ($pawn_attack(p, s2) && Math.abs(x - x2) == 1 && y - y2 == flipy ? 1 : -1 ||
                                            $knight_attack(p, s2, s) ||
                                            $bishop_xray_attack(p, s2, s) ||
                                            $rook_xray_attack(p, s2, s) ||
                                            $queen_attack(p, s2, s)) a = false;
                                    }
                                    if (!a && $knight_attack(p, s2, s) && $safe_check(p, s2, 0) > 0) a = true;
                                    if (!a && $bishop_xray_attack(p, s2, s) && $safe_check(p, s2, 1) > 0) a = true;
                                    if (!a && $rook_xray_attack(p, s2, s) && $safe_check(p, s2, 2) > 0) a = true;
                                    if (!a && $queen_attack(p, s2, s) && $safe_check(p, s2, 3) > 0) a = true;
                                    if (a) {
                                        if (!flipy) showArrow3({
                                            from: s,
                                            to: s2
                                        });
                                        else showArrow3({
                                            from: {
                                                x: x,
                                                y: 7 - y
                                            },
                                            to: {
                                                x: x2,
                                                y: 7 - y2
                                            }
                                        });
                                        finalArrow3();
                                    }
                                }
                        };
                        showKDarrows(pos, false);
                        showKDarrows(colorflip(pos), true);
                    } else {
                        try {
                            sqeval = func(pos, {
                                x: x,
                                y: y
                            });
                            if (sqeval == 0 && sei.forwhite) sqeval = func(colorflip(pos), {
                                x: x,
                                y: 7 - y
                            });
                            if (sqeval == 0) sqeval = func(pos, {
                                x: x,
                                y: y
                            }, true);
                            if (sqeval == 0 && sei.forwhite) sqeval = func(colorflip(pos), {
                                x: x,
                                y: 7 - y
                            }, true);
                        } catch (e) {}
                    }
                    var c = div.className.split(' ')[0] + " " + div.className.split(' ')[1];
                    if (div.className.indexOf(" h2") >= 0) c += " h2";
                    if (sqeval != 0) c += " h3";
                    div.className = c;
                }
            };
            elem.appendChild(node1);
        }
        setElemText(document.getElementById('staticInfo'), "Static evaluation (" + (total / evalUnit).toFixed(2) + ")");
    }, 50);
}

function repaintLczero() {
    if (document.getElementById("wLczero").style.display == "none") return;

    var curfen = getCurFEN();

    // Lczero window
    window.setTimeout(function() {
        if (getCurFEN() != curfen) return;
        if (network != null && network.model == null) {
            window.setTimeout(repaintLczero, 1000);
            return;
        }
        var elem = document.getElementById("lczero");
        while (elem.firstChild) elem.removeChild(elem.firstChild);
        var showwait = function() {
            var elem = document.getElementById("lczero");
            while (elem.firstChild) elem.removeChild(elem.firstChild);
            var node0 = document.createElement("DIV");
            setElemText(node0, "Please wait...");
            node0.className = "wait";
            elem.appendChild(node0);
        }
        if (network == null) {
            var node0 = document.createElement("DIV");
            setElemText(node0, "Load Built-In Data");
            node0.className = "loadButton";
            node0.onclick = function() {
                showwait();
                load_network("weights_32930.dat.gz", null, repaintLczero);
            }

            var node2 = document.createElement("INPUT");
            node2.type = "file"
            node2.style.display = "none";
            node2.onchange = function(e) {
                showwait();
                load_network(e.target.files[0].name, e.target.files[0], repaintLczero);
            }

            var node1 = document.createElement("DIV");
            setElemText(node1, "Load Custom Data");
            node1.className = "loadButton";
            node1.onclick = function() {
                node2.click();
            }

            elem.appendChild(node2);
            elem.appendChild(node0);
            elem.appendChild(node1);

        } else {
            showwait();
            window.setTimeout(function() {
                var result = lczeroEvaluate();
                while (elem.firstChild) elem.removeChild(elem.firstChild);
                if (result != null) {
                    var moveslist = result[0];
                    var value = 290.680623072 * Math.tan(1.548090806 * result[1]);
                    var nodeParent = document.createElement("DIV");
                    if (moveslist.length > 0) moveslist.sort(function(a, b) {
                        return a.policy == b.policy ? 0 : a.policy < b.policy ? 1 : -1;
                    });
                    var policytotal = 0,
                        policypart = 0;
                    for (var i = 0; i < moveslist.length; i++) policytotal += moveslist[i].policy;
                    for (var i = 0; i < moveslist.length; i++) {
                        var ci = -1;
                        for (var j = 0; j < _curmoves.length; j++) {
                            if (_curmoves[j].move.from.x == moveslist[i].from.x &&
                                _curmoves[j].move.from.y == moveslist[i].from.y &&
                                _curmoves[j].move.to.x == moveslist[i].to.x &&
                                _curmoves[j].move.to.y == moveslist[i].to.y &&
                                _curmoves[j].move.p == moveslist[i].p) ci = j;
                        }
                        if (ci < 0) continue;
                        var node1 = document.createElement("DIV");
                        node1.className = "line";
                        var node0 = document.createElement("SPAN");
                        node0.className = "circle " + (policypart / policytotal < 0.8 ? "ok" : policypart / policytotal < 0.95 ? "mi" : "bl");
                        policypart += moveslist[i].policy
                        var node2 = document.createElement("SPAN");
                        node2.className = "san";
                        node2.appendChild(document.createTextNode(_curmoves[ci].san));
                        var node7 = document.createElement("SPAN");
                        node7.className = "policy";
                        node7.appendChild(document.createTextNode(((100 * moveslist[i].policy / policytotal).toFixed(2)) + "%"));
                        var node3 = document.createElement("SPAN");
                        node3.className = "eval";
                        var text = (value / 100).toFixed(2);
                        if (text.indexOf(".") >= 0) {
                            var node4 = document.createElement("SPAN");
                            node4.className = "numleft";
                            node4.appendChild(document.createTextNode(text.substring(0, text.indexOf(".") + 1)));
                            var node5 = document.createElement("SPAN");
                            node5.className = "numright";
                            node5.appendChild(document.createTextNode(text.substring(text.indexOf(".") + 1)));
                            node3.appendChild(node4);
                            node3.appendChild(node5);
                        } else {
                            node3.appendChild(document.createTextNode(text));
                        }
                        node1.appendChild(node0);
                        node1.appendChild(node2);
                        node1.appendChild(node7);
                        node1.appendChild(node3);
                        node1.san = _curmoves[ci].san;
                        node1.index = ci;
                        node1.onmouseover = function() {
                            this.index = findMoveIndexBySan(this.san);
                            if (this.index != null) highlightMove(this.index, true);
                        };
                        node1.onmouseout = function() {
                            if (this.index != null) highlightMove(this.index, false);
                        };
                        node1.onmousedown = function(e) {
                            this.index = findMoveIndexBySan(this.san);
                            if (_menu) showHideMenu(false);
                            if (this.index != null) doMoveHandler(_curmoves[this.index].move);
                        };
                        if (_historyindex + 1 < _history.length && _history[_historyindex + 1].length > 3 && _history[_historyindex + 1][3] == _curmoves[ci].san) node1.style.color = "#64c4db"
                        nodeParent.appendChild(node1);
                    }
                    elem.appendChild(nodeParent);
                } else {
                    var node0 = document.createElement("DIV");
                    setElemText(node0, "Error");
                    elem.appendChild(node0);
                }
            }, 1);
        }
    }, 50);

}

function getCircleClassName(i) {
    var cl = "circle";
    if (_curmoves[i].eval != null && _curmoves[0].eval != null) {
        var etop = Math.max(-6, Math.min(6, _curmoves[0].eval / 100));
        var ecur = Math.max(-6, Math.min(6, _curmoves[i].eval / 100));
        var lost = Math.abs(etop - ecur);
        if (lost <= 1.0) cl += " ok";
        else if (lost <= 3.0) cl += " mi";
        else cl += " bl";
    }
    return cl;
}
var _movesPv = false;

function showEvals() {
    setElemText(document.getElementById("moves"), "");
    setElemText(document.getElementById("buttonMovesPv"), _movesPv ? "PV" : "Reply");
    if (_curmoves.length > 0) {
        var sortfunc = function(a, b) {
            var a0 = a.eval == null ? -2000000 : a.eval * (_curmoves[0].w ? -1 : 1);
            var b0 = b.eval == null ? -2000000 : b.eval * (_curmoves[0].w ? -1 : 1);

            var r = 0;
            if (a0 < b0 || (a0 == b0 && a.san < b.san)) r = 1;
            if (a0 > b0 || (a0 == b0 && a.san > b.san)) r = -1;
            return r;
        }
        _curmoves.sort(sortfunc);
    }
    for (var i = 0; i < _curmoves.length; i++) {
        var node1 = document.createElement("DIV");
        node1.className = "line";
        var node0 = document.createElement("SPAN");
        node0.className = getCircleClassName(i);
        var node2 = document.createElement("SPAN");
        node2.appendChild(document.createTextNode(_curmoves[i].san));
        node2.className = "san";
        var node3 = document.createElement("SPAN");
        node3.className = "eval";
        var node6 = document.createElement("SPAN");
        node6.className = "pv";
        if (_movesPv) node6.appendChild(document.createTextNode(_curmoves[i].pvtext || "?"));
        else node6.appendChild(document.createTextNode((_curmoves[i].pvtext || "?").split(' ')[0]));
        var node7 = document.createElement("SPAN");
        node7.className = "depth";
        node7.appendChild(document.createTextNode(_curmoves[i].depth | "?"));

        var text = getEvalText(_curmoves[i].eval, false);
        if (text.indexOf(".") >= 0) {
            var node4 = document.createElement("SPAN");
            node4.className = "numleft";
            node4.appendChild(document.createTextNode(text.substring(0, text.indexOf(".") + 1)));
            var node5 = document.createElement("SPAN");
            node5.className = "numright";
            node5.appendChild(document.createTextNode(text.substring(text.indexOf(".") + 1)));
            node3.appendChild(node4);
            node3.appendChild(node5);
        } else {
            node3.appendChild(document.createTextNode(text));
        }
        node1.appendChild(node0);
        node1.appendChild(node2);
        node1.appendChild(node3);
        node1.appendChild(node6);
        node1.appendChild(node7);
        node1.index = i;
        node1.onmouseover = function() {
            highlightMove(this.index, true);
        };
        node1.onmouseout = function() {
            highlightMove(this.index, false);
        };
        node1.onmousedown = function(e) {
            if (_menu) showHideMenu(false);
            doMoveHandler(_curmoves[this.index].move);
        };
        if (_historyindex + 1 < _history.length && _history[_historyindex + 1].length > 3 && _history[_historyindex + 1][3] == _curmoves[i].san) node1.style.color = "#64c4db"
        document.getElementById("moves").appendChild(node1);
    }
    if (_arrow) setArrow(true);
    updateLegalMoves();
}

// Chess position

function bounds(x, y) {
    return x >= 0 && x <= 7 && y >= 0 && y <= 7;
}

function board(pos, x, y) {
    if (x >= 0 && x <= 7 && y >= 0 && y <= 7) return pos.b[x][y];
    return "x";
}

function colorflip(pos) {
    var board = new Array(8);
    for (var i = 0; i < 8; i++) board[i] = new Array(8);
    for (x = 0; x < 8; x++)
        for (y = 0; y < 8; y++) {
            board[x][y] = pos.b[x][7 - y];
            var color = board[x][y].toUpperCase() == board[x][y];
            board[x][y] = color ? board[x][y].toLowerCase() : board[x][y].toUpperCase();
        }
    return {
        b: board,
        c: [pos.c[2], pos.c[3], pos.c[0], pos.c[1]],
        e: pos.e == null ? null : [pos.e[0], 7 - pos.e[1]],
        w: !pos.w,
        m: [pos.m[0], pos.m[1]]
    };
}

function sum(pos, func, param) {
    var sum = 0;
    for (var x = 0; x < 8; x++)
        for (var y = 0; y < 8; y++) sum += func(pos, {
            x: x,
            y: y
        }, param);
    return sum;
}

function parseMoveNumber(fen) {
    var a = fen.replace(/^\s+/, '').split(' ');
    return (a.length > 5 && !isNaN(a[5]) && a[5] != '') ? parseInt(a[5]) : 1;
}

function parseFEN(fen) {
    var board = new Array(8);
    for (var i = 0; i < 8; i++) board[i] = new Array(8);
    var a = fen.replace(/^\s+/, '').split(' '),
        s = a[0],
        x, y;
    for (x = 0; x < 8; x++)
        for (y = 0; y < 8; y++) {
            board[x][y] = '-';
        }
    x = 0, y = 0;
    for (var i = 0; i < s.length; i++) {
        if (s[i] == ' ') break;
        if (s[i] == '/') {
            x = 0;
            y++;
        } else {
            if (!bounds(x, y)) continue;
            if ('KQRBNP'.indexOf(s[i].toUpperCase()) != -1) {
                board[x][y] = s[i];
                x++;
            } else if ('0123456789'.indexOf(s[i]) != -1) {
                x += parseInt(s[i]);
            } else x++;
        }
    }
    var castling, enpassant, whitemove = !(a.length > 1 && a[1] == 'b');
    if (a.length > 2) {
        castling = [a[2].indexOf('K') != -1, a[2].indexOf('Q') != -1,
            a[2].indexOf('k') != -1, a[2].indexOf('q') != -1
        ];
    } else {
        castling = [true, true, true, true];
    }
    if (a.length > 3 && a[3].length == 2) {
        var ex = 'abcdefgh'.indexOf(a[3][0]);
        var ey = '87654321'.indexOf(a[3][1]);
        enpassant = (ex >= 0 && ey >= 0) ? [ex, ey] : null;
    } else {
        enpassant = null;
    }
    var movecount = [(a.length > 4 && !isNaN(a[4]) && a[4] != '') ? parseInt(a[4]) : 0,
        (a.length > 5 && !isNaN(a[5]) && a[5] != '') ? parseInt(a[5]) : 1
    ];
    return {
        b: board,
        c: castling,
        e: enpassant,
        w: whitemove,
        m: movecount
    };
}

function generateFEN(pos) {
    var s = '',
        f = 0,
        castling = pos.c,
        enpassant = pos.e,
        board = pos.b;
    for (var y = 0; y < 8; y++) {
        for (var x = 0; x < 8; x++) {
            if (board[x][y] == '-') {
                f++;
            } else {
                if (f > 0) s += f, f = 0;
                s += board[x][y];
            }
        }
        if (f > 0) s += f, f = 0;
        if (y < 7) s += '/';
    }
    s += ' ' + (pos.w ? 'w' : 'b') +
        ' ' + ((castling[0] || castling[1] || castling[2] || castling[3]) ?
            ((castling[0] ? 'K' : '') + (castling[1] ? 'Q' : '') +
                (castling[2] ? 'k' : '') + (castling[3] ? 'q' : '')) :
            '-') +
        ' ' + (enpassant == null ? '-' : ('abcdefgh' [enpassant[0]] + '87654321' [enpassant[1]])) +
        ' ' + pos.m[0] + ' ' + pos.m[1];
    return s;
}

function isWhiteCheck(pos) {
    var kx = null,
        ky = null;
    for (var x = 0; x < 8; x++) {
        for (var y = 0; y < 8; y++) {
            if (pos.b[x][y] == 'K') {
                kx = x;
                ky = y;
            }
        }
    }
    if (kx == null || ky == null) return false;
    if (board(pos, kx + 1, ky - 1) == 'p' ||
        board(pos, kx - 1, ky - 1) == 'p' ||
        board(pos, kx + 2, ky + 1) == 'n' ||
        board(pos, kx + 2, ky - 1) == 'n' ||
        board(pos, kx + 1, ky + 2) == 'n' ||
        board(pos, kx + 1, ky - 2) == 'n' ||
        board(pos, kx - 2, ky + 1) == 'n' ||
        board(pos, kx - 2, ky - 1) == 'n' ||
        board(pos, kx - 1, ky + 2) == 'n' ||
        board(pos, kx - 1, ky - 2) == 'n' ||
        board(pos, kx - 1, ky - 1) == 'k' ||
        board(pos, kx, ky - 1) == 'k' ||
        board(pos, kx + 1, ky - 1) == 'k' ||
        board(pos, kx - 1, ky) == 'k' ||
        board(pos, kx + 1, ky) == 'k' ||
        board(pos, kx - 1, ky + 1) == 'k' ||
        board(pos, kx, ky + 1) == 'k' ||
        board(pos, kx + 1, ky + 1) == 'k') return true;
    for (var i = 0; i < 8; i++) {
        var ix = (i + (i > 3)) % 3 - 1;
        var iy = (((i + (i > 3)) / 3) << 0) - 1;
        for (var d = 1; d < 8; d++) {
            var b = board(pos, kx + d * ix, ky + d * iy);
            var line = ix == 0 || iy == 0;
            if (b == 'q' || b == 'r' && line || b == 'b' && !line) return true;
            if (b != "-") break;
        }
    }
    return false;
}

function doMove(pos, from, to, promotion) {
    if (pos.b[from.x][from.y].toUpperCase() != pos.b[from.x][from.y]) {
        var r = colorflip(doMove(colorflip(pos), {
            x: from.x,
            y: 7 - from.y
        }, {
            x: to.x,
            y: 7 - to.y
        }, promotion));
        r.m[1]++;
        return r;
    }
    var r = colorflip(colorflip(pos));
    r.w = !r.w;
    if (from.x == 7 && from.y == 7) r.c[0] = false;
    if (from.x == 0 && from.y == 7) r.c[1] = false;
    if (to.x == 7 && to.y == 0) r.c[2] = false;
    if (to.x == 0 && to.y == 0) r.c[3] = false;
    if (from.x == 4 && from.y == 7) r.c[0] = r.c[1] = false;
    r.e = pos.b[from.x][from.y] == 'P' && from.y == 6 && to.y == 4 ? [from.x, 5] : null;
    if (pos.b[from.x][from.y] == 'K') {
        if (Math.abs(from.x - to.x) > 1) {
            r.b[from.x][from.y] = '-';
            r.b[to.x][to.y] = 'K';
            r.b[to.x > 4 ? 5 : 3][to.y] = 'R';
            r.b[to.x > 4 ? 7 : 0][to.y] = '-';
            return r;
        }
    }
    if (pos.b[from.x][from.y] == 'P' && to.y == 0) {
        r.b[to.x][to.y] = promotion != null ? promotion : 'Q';
    } else if (pos.b[from.x][from.y] == 'P' &&
        pos.e != null && to.x == pos.e[0] && to.y == pos.e[1] &&
        Math.abs(from.x - to.x) == 1) {
        r.b[to.x][from.y] = '-';
        r.b[to.x][to.y] = pos.b[from.x][from.y];

    } else {
        r.b[to.x][to.y] = pos.b[from.x][from.y];
    }
    r.b[from.x][from.y] = '-';
    r.m[0] = (pos.b[from.x][from.y] == 'P' || pos.b[to.x][to.y] != '-') ? 0 : r.m[0] + 1;
    return r;
}

function isLegal(pos, from, to) {
    if (!bounds(from.x, from.y)) return false;
    if (!bounds(to.x, to.y)) return false;
    if (from.x == to.x && from.y == to.y) return false;
    if (pos.b[from.x][from.y] != pos.b[from.x][from.y].toUpperCase()) {
        return isLegal(colorflip(pos), {
            x: from.x,
            y: 7 - from.y
        }, {
            x: to.x,
            y: 7 - to.y
        })
    }
    if (!pos.w) return false;
    var pfrom = pos.b[from.x][from.y];
    var pto = pos.b[to.x][to.y];
    if (pto.toUpperCase() == pto && pto != '-') return false;
    if (pfrom == '-') {
        return false;
    } else if (pfrom == 'P') {
        var enpassant = pos.e != null && to.x == pos.e[0] && to.y == pos.e[1];
        if (!((from.x == to.x && from.y == to.y + 1 && pto == '-') ||
                (from.x == to.x && from.y == 6 && to.y == 4 && pto == '-' && pos.b[to.x][5] == '-') ||
                (Math.abs(from.x - to.x) == 1 && from.y == to.y + 1 && (pto != '-' || enpassant))
            )) return false;
    } else if (pfrom == 'N') {
        if (Math.abs(from.x - to.x) < 1 || Math.abs(from.x - to.x) > 2) return false;
        if (Math.abs(from.y - to.y) < 1 || Math.abs(from.y - to.y) > 2) return false;
        if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) != 3) return false;
    } else if (pfrom == 'K') {
        var castling = true;
        if (from.y != 7 || to.y != 7) castling = false;
        if (from.x != 4 || (to.x != 2 && to.x != 6)) castling = false;
        if (to.x == 6 && !pos.c[0] || to.x == 2 && !pos.c[1]) castling = false;
        if (to.x == 2 && pos.b[0][7] + pos.b[1][7] + pos.b[2][7] + pos.b[3][7] != 'R---') castling = false;
        if (to.x == 6 && pos.b[5][7] + pos.b[6][7] + pos.b[7][7] != '--R') castling = false;
        if ((Math.abs(from.x - to.x) > 1 || Math.abs(from.y - to.y) > 1) && !castling) return false;
        if (castling && isWhiteCheck(pos)) return false;
        if (castling && isWhiteCheck(doMove(pos, from, {
                x: to.x == 2 ? 3 : 5,
                y: 7
            }))) return false;
    }
    if (pfrom == 'B' || pfrom == 'R' || pfrom == 'Q') {
        var a = from.x - to.x,
            b = from.y - to.y;
        var line = a == 0 || b == 0;
        var diag = Math.abs(a) == Math.abs(b);
        if (!line && !diag) return false;
        if (pfrom == 'R' && !line) return false;
        if (pfrom == 'B' && !diag) return false;
        var count = Math.max(Math.abs(a), Math.abs(b));
        var ix = a > 0 ? -1 : a < 0 ? 1 : 0,
            iy = b > 0 ? -1 : b < 0 ? 1 : 0;
        for (var i = 1; i < count; i++) {
            if (pos.b[from.x + ix * i][from.y + iy * i] != '-') return false;
        }
    }
    if (isWhiteCheck(doMove(pos, from, to))) return false;
    return true;
}

function parseMove(pos, s) {
    var promotion = null;
    s = s.replace(/[\+|#|\?|!|x]/g, "");
    if (s.length >= 2 && s[s.length - 2] == "=") {
        promotion = s[s.length - 1]
        s = s.substring(0, s.length - 2);
    }
    if (s.length >= 3 && "NBRQ".indexOf(s[s.length - 1]) >= 0) {
        promotion = s[s.length - 1]
        s = s.substring(0, s.length - 1);
    }
    if (s == "O-O" || s == "O-O-O") {
        var from = {
                x: 4,
                y: pos.w ? 7 : 0
            },
            to = {
                x: s == "O-O" ? 6 : 2,
                y: pos.w ? 7 : 0
            };
        if (isLegal(pos, from, to)) return {
            from: from,
            to: to
        };
        else return null;
    } else {
        var p;
        if ("PNBRQK".indexOf(s[0]) < 0) {
            p = "P";
        } else {
            p = s[0];
            s = s.substring(1);
        }
        if (s.length < 2 || s.length > 4) return null;
        var xto = "abcdefgh".indexOf(s[s.length - 2]);
        var yto = "87654321".indexOf(s[s.length - 1]);
        var xfrom = -1,
            yfrom = -1;
        if (s.length > 2) {
            xfrom = "abcdefgh".indexOf(s[0]);
            yfrom = "87654321".indexOf(s[s.length - 3]);
        }
        for (var x = 0; x < 8; x++) {
            for (var y = 0; y < 8; y++) {
                if (xfrom != -1 && xfrom != x) continue;
                if (yfrom != -1 && yfrom != y) continue;
                if (pos.b[x][y] == (pos.w ? p : p.toLowerCase()) && isLegal(pos, {
                        x: x,
                        y: y
                    }, {
                        x: xto,
                        y: yto
                    })) {
                    xfrom = x;
                    yfrom = y;
                }
            }
        }
        if (xto < 0 || yto < 0 || xfrom < 0 || yfrom < 0) return null;
        return {
            from: {
                x: xfrom,
                y: yfrom
            },
            to: {
                x: xto,
                y: yto
            },
            p: promotion
        };
    }
}

function genMoves(pos) {
    var moves = [];
    for (var x1 = 0; x1 < 8; x1++)
        for (var y1 = 0; y1 < 8; y1++)
            for (var x2 = 0; x2 < 8; x2++)
                for (var y2 = 0; y2 < 8; y2++) {
                    if (isLegal(pos, {
                            x: x1,
                            y: y1
                        }, {
                            x: x2,
                            y: y2
                        })) {
                        if ((y2 == 0 || y2 == 7) && pos.b[x1][y1].toUpperCase() == "P") {
                            moves.push({
                                from: {
                                    x: x1,
                                    y: y1
                                },
                                to: {
                                    x: x2,
                                    y: y2
                                },
                                p: "N"
                            });
                            moves.push({
                                from: {
                                    x: x1,
                                    y: y1
                                },
                                to: {
                                    x: x2,
                                    y: y2
                                },
                                p: "B"
                            });
                            moves.push({
                                from: {
                                    x: x1,
                                    y: y1
                                },
                                to: {
                                    x: x2,
                                    y: y2
                                },
                                p: "R"
                            });
                            moves.push({
                                from: {
                                    x: x1,
                                    y: y1
                                },
                                to: {
                                    x: x2,
                                    y: y2
                                },
                                p: "Q"
                            });
                        } else moves.push({
                            from: {
                                x: x1,
                                y: y1
                            },
                            to: {
                                x: x2,
                                y: y2
                            }
                        });
                    }
                }
    return moves;
}

function sanMove(pos, move, moves) {
    var s = "";
    if (move.from.x == 4 && move.to.x == 6 && pos.b[move.from.x][move.from.y].toLowerCase() == "k") {
        s = 'O-O';
    } else if (move.from.x == 4 && move.to.x == 2 && pos.b[move.from.x][move.from.y].toLowerCase() == "k") {
        s = 'O-O-O';
    } else {
        var piece = pos.b[move.from.x][move.from.y].toUpperCase();
        if (piece != "P") {
            var a = 0,
                sx = 0,
                sy = 0;
            for (var i = 0; i < moves.length; i++) {
                if (pos.b[moves[i].from.x][moves[i].from.y] == pos.b[move.from.x][move.from.y] &&
                    (moves[i].from.x != move.from.x || moves[i].from.y != move.from.y) &&
                    (moves[i].to.x == move.to.x && moves[i].to.y == move.to.y)) {
                    a++;
                    if (moves[i].from.x == move.from.x) sx++;
                    if (moves[i].from.y == move.from.y) sy++;
                }
            }
            s += piece;
            if (a > 0) {
                if (sx > 0 && sy > 0) s += "abcdefgh" [move.from.x] + "87654321" [move.from.y];
                else if (sx > 0) s += "87654321" [move.from.y];
                else s += "abcdefgh" [move.from.x];
            }
        }
        if (pos.b[move.to.x][move.to.y] != "-" || piece == "P" && move.to.x != move.from.x) {
            if (piece == "P") s += "abcdefgh" [move.from.x];
            s += 'x';
        }
        s += "abcdefgh" [move.to.x] + "87654321" [move.to.y];
        if (piece == "P" && (move.to.y == 0 || move.to.y == 7)) s += "=" + (move.p == null ? "Q" : move.p);
    }
    var pos2 = doMove(pos, move.from, move.to, move.p);
    if (isWhiteCheck(pos2) || isWhiteCheck(colorflip(pos2))) s += genMoves(pos2).length == 0 ? "#" : "+";
    return s;
}

function fixCastling(pos) {
    pos.c[0] &= !(pos.b[7][7] != 'R' || pos.b[4][7] != 'K');
    pos.c[1] &= !(pos.b[0][7] != 'R' || pos.b[4][7] != 'K');
    pos.c[2] &= !(pos.b[7][0] != 'r' || pos.b[4][0] != 'k');
    pos.c[3] &= !(pos.b[0][0] != 'r' || pos.b[4][0] != 'k');
}

function checkPosition(pos) {
    var errmsgs = [];
    var wk = bk = 0,
        wp = bp = 0,
        wpr = bpr = 0,
        wn = wb1 = wb2 = wr = wq = 0,
        bn = bb1 = bb2 = br = bq = 0;
    for (var x = 0; x < 8; x++) {
        for (var y = 0; y < 8; y++) {
            var c = ((x + y) % 2) == 0;
            if (pos.b[x][y] == 'K') wk++;
            if (pos.b[x][y] == 'k') bk++;
            if (pos.b[x][y] == 'P') wp++;
            if (pos.b[x][y] == 'p') bp++;
            if (pos.b[x][y] == 'N') wn++;
            if (pos.b[x][y] == 'n') bn++;
            if (c && pos.b[x][y] == 'B') wb1++;
            if (c && pos.b[x][y] == 'b') bb1++;
            if (!c && pos.b[x][y] == 'B') wb2++;
            if (!c && pos.b[x][y] == 'b') bb2++;
            if (pos.b[x][y] == 'R') wr++;
            if (pos.b[x][y] == 'r') br++;
            if (pos.b[x][y] == 'Q') wq++;
            if (pos.b[x][y] == 'q') bq++;
            if (pos.b[x][y] == 'P' && (y == 0 || y == 7)) wpr++;
            if (pos.b[x][y] == 'p' && (y == 0 || y == 7)) bpr++;
        }
    }
    if (wk == 0) errmsgs.push("Missing white king");
    if (bk == 0) errmsgs.push("Missing black king");
    if (wk > 1) errmsgs.push("Two white kings");
    if (bk > 1) errmsgs.push("Two black kings");
    var wcheck = isWhiteCheck(pos);
    var bcheck = isWhiteCheck(colorflip(pos));
    if (pos.w && bcheck || !pos.w && wcheck) errmsgs.push("Non-active color is in check");
    if (wp > 8) errmsgs.push("Too many white pawns");
    if (bp > 8) errmsgs.push("Too many black pawns");
    if (wpr > 0) errmsgs.push("White pawns in first or last rank");
    if (bpr > 0) errmsgs.push("Black pawns in first or last rank");
    var we = Math.max(0, wq - 1) + Math.max(0, wr - 2) + Math.max(0, wb1 - 1) + Math.max(0, wb2 - 1) + Math.max(0, wn - 2);
    var be = Math.max(0, bq - 1) + Math.max(0, br - 2) + Math.max(0, bb1 - 1) + Math.max(0, bb2 - 1) + Math.max(0, bn - 2);
    if (we > Math.max(0, 8 - wp)) errmsgs.push("Too many extra white pieces");
    if (be > Math.max(0, 8 - bp)) errmsgs.push("Too many extra black pieces");
    if ((pos.c[0] && (pos.b[7][7] != 'R' || pos.b[4][7] != 'K')) ||
        (pos.c[1] && (pos.b[0][7] != 'R' || pos.b[4][7] != 'K'))) errmsgs.push("White has castling rights and king or rook not in their starting position");
    if ((pos.c[2] && (pos.b[7][0] != 'r' || pos.b[4][0] != 'k')) ||
        (pos.c[3] && (pos.b[0][0] != 'r' || pos.b[4][0] != 'k'))) errmsgs.push("Black has castling rights and king or rook not in their starting position");
    return errmsgs;
}

// Move list
function refreshMoves() {
    var pos = parseFEN(getCurFEN());
    _curmoves = [];
    setElemText(document.getElementById("moves"), "");
    var errmsgs = checkPosition(pos);
    if (errmsgs.length == 0) {
        var moves = genMoves(pos);
        for (var i = 0; i < moves.length; i++) {
            _curmoves.push({
                move: moves[i],
                san: sanMove(pos, moves[i], moves),
                fen: generateFEN(doMove(pos, moves[i].from, moves[i].to, moves[i].p)),
                w: !pos.w,
                eval: null,
                depth: 0
            });
        }
        if (_curmoves.length == 0) {
            var matecheck = pos.w && isWhiteCheck(pos) || !pos.w && isWhiteCheck(colorflip(pos));
            var div0 = document.createElement('div');
            div0.style.padding = "8px 16px";
            var div = document.createElement('div');
            div.style.backgroundColor = "#800080";
            div.className = "positionStatus";
            setElemText(div, matecheck ? "Checkmate" : "Stalemate");
            div0.appendChild(div);
            var ul = document.createElement('ul'),
                li = document.createElement('li');
            setElemText(li, matecheck && pos.w ? "Black wins" : matecheck ? "White wins" : "Draw");
            ul.appendChild(li);
            div0.appendChild(ul);
            document.getElementById("moves").appendChild(div0);
        } else {
            showEvals();
        }
    } else {
        var div0 = document.createElement('div');
        div0.style.padding = "8px 16px";
        var div = document.createElement('div');
        div.style.backgroundColor = "#bb0000";
        div.className = "positionStatus";
        setElemText(div, "Illegal position");
        div0.appendChild(div);

        var ul = document.createElement('ul');
        for (var i = 0; i < errmsgs.length; i++) {
            var li = document.createElement('li');
            setElemText(li, errmsgs[i]);
            ul.appendChild(li);
        }
        div0.appendChild(ul);

        document.getElementById("moves").appendChild(div0);

    }

}

// History

function historyButtons() {
    document.getElementById('buttonBack').className = _historyindex > 0 ? "on" : "off";
    document.getElementById('buttonForward').className = _historyindex < _history.length - 1 ? "on" : "off";
}

function historySave() {}

function historyAdd(fen, oldhistory, move, san) {
    if (_historyindex >= 0 && _history[_historyindex][0] == fen) return;
    var c = null;
    if (oldhistory != null) {
        for (var i = 0; i < oldhistory.length; i++) {
            if (oldhistory[i][0] == fen && oldhistory[i].length > 1) c = oldhistory[i][1];
        }
    } else {
        if (_history2 == null) {
            _history2 = [_historyindex, JSON.parse(JSON.stringify(_history))];
            refreshButtonRevert();
        }
    }
    _historyindex++;
    _history.length = _historyindex;
    _history.push([fen, c, move, san]);
    historyButtons();
    historySave();
}

function historyMove(v, e, ctrl) {
    if (e == null) e = window.event;
    var oldindex = _historyindex;
    if (_historyindex == _history.length - 1 &&
        _history[_historyindex][0] != getCurFEN()) historyAdd(getCurFEN());
    _historyindex += v
    if (_historyindex < 0) _historyindex = 0;
    if (_historyindex >= _history.length) _historyindex = _history.length - 1;
    if ((e != null && e.ctrlKey && Math.abs(v) == 1) || ctrl) _historyindex = v == 1 ? _history.length - 1 : 0;
    if (v == 0 || (oldindex != _historyindex || getCurFEN() != _history[_historyindex][0])) {
        setCurFEN(_history[_historyindex][0]);
        historyButtons();
        historySave();
        showBoard();
    }
}

function historyKeep(wname, bname) {
    _wname = wname || "White";
    _bname = bname || "Black";
    _history2 = null;
    refreshButtonRevert();
    historyMove(0);
}

// Mouse and keyboard events
function getCurScale() {
    if (document.getElementById("wChessboard").style.display == "none") return 1;
    return Math.min((document.getElementById("wChessboard").clientWidth - 414 + 408) / 408,
        (document.getElementById("wChessboard").clientHeight + (_mobile ? 30 : 0) - 437 + 368) / 368);
}

function getDragX(x, full) {
    var bb = document.getElementById('chessboard1').getBoundingClientRect();
    var w = bb.width / 8;
    var offsetX = bb.left + w / 2;
    if (_flip) return 7 - Math.round((x - offsetX) / w);
    else return Math.round((x - offsetX) / w);
}

function getDragY(y, full) {
    var bb = document.getElementById('chessboard1').getBoundingClientRect();
    var h = bb.width / 8;
    var offsetY = bb.top + h / 2;
    if (_flip) return 7 - Math.round((y - offsetY) / h);
    else return Math.round((y - offsetY) / h);
}

function getCurSan(move) {
    if (move == null) return null;
    for (var i = 0; i < _curmoves.length; i++)
        if (_curmoves[i].move.from.x == move.from.x && _curmoves[i].move.from.y == move.from.y &&
            _curmoves[i].move.to.x == move.to.x && _curmoves[i].move.to.y == move.to.y &&
            _curmoves[i].move.p == move.p) return _curmoves[i].san;
    return null;
}

function onMouseDown(e) {
    if (_menu) showHideMenu(false, e);
    if (e == null) e = window.event;
    var elem = target = e.target != null ? e.target : e.srcElement;
    if (document.onmousemove == graphMouseMove && target != null && target.id != 'graphWrapper' && target.id != 'graph') {
        document.getElementById("graphWrapper").onmouseout();
    } else if (document.onmousemove == graphMouseMove) {
        graphMouseDown(e);
        return;
    }
    if (_dragElement != null) return true;
    if (target != null && target.className == 'cbCell' && target.children[0].id == 'chessboard1') {
        target = target.children[0];
        var bb = document.getElementById('chessboard1').getBoundingClientRect();
        var w = bb.width / 8;
        var cx = Math.round((e.clientX - bb.left - (w / 2)) / w);
        var cy = Math.round((e.clientY - bb.top - (w / 2)) / w);
        for (var i = 0; i < target.children.length; i++) {
            e0 = target.children[i];
            if (e0.style.left == (cx * 40) + "px" && e0.style.top == (cy * 40) + "px") elem = e0;
        }
    }
    while (target != null && target.id != 'chessboard1' && target.id != 'editWrapper' && target.tagName != 'BODY') {
        target = target.parentNode;
    }
    if (target == null) return true;
    if (elem.id == 'editWrapper' || elem.className.length < 3) return;
    if (target.id != 'editWrapper' && target.id != 'chessboard1') return true;

    var edit = isEdit();
    if (edit && target.id == 'chessboard1' && elem.className != null && (e.which === 2 || e.button === 4)) {
        if (getPaintPiece() == elem.className[2]) setPaintPiece('S');
        else setPaintPiece(elem.className[2]);
        if (e && e.preventDefault) e.preventDefault();
        return;
    }
    if (target.id == 'chessboard1' && edit && (getPaintPiece() != 'S' || (e.which === 3 || e.button === 2))) {
        if (e && e.preventDefault) e.preventDefault();
        paintMouse(e);
        return;
    }

    document.onmousemove = onMouseMove;
    document.body.focus();
    document.onselectstart = function() {
        return false;
    };
    elem.ondragstart = function() {
        return false;
    };
    _dragActive = false;
    _dragElement = elem;
    _startX = e.clientX;
    _startY = e.clientY;
    _dragCtrl = target.id == 'editWrapper' ? true : e.ctrlKey;
    _dragLMB = (e.which === 3 || e.button === 2) ? 1 : 0;
    return false;

}

function dragActivate() {
    if (_dragElement == null) return;
    if (_dragElement.parentNode == null) return;
    if (_dragElement.className[2] == '-' && !dragFromEditTools) return;
    var dragFromEditTools = _dragElement.parentNode.id != 'chessboard1';

    var clone = _dragElement.cloneNode(false);
    if (!_dragCtrl) _dragElement.className = _dragElement.className[0] + " -";
    _dragElement = clone;
    _dragElement.className = _dragElement.className.substring(0, 3);
    _dragElement.style.backgroundColor = "transparent";
    _dragElement.style.background = "none";
    _dragElement.style.zIndex = 10000;
    _dragElement.style.pointerEvents = "none";
    _dragElement.style.transform = "scale(" + getCurScale() + ")";
    document.getElementById('dragPiece').appendChild(_dragElement);
    _dragActive = true;
    if (!isEdit() && !_dragCtrl) showLegalMoves({
        x: getDragX(_startX),
        y: getDragY(_startY)
    });
    if (dragFromEditTools) setPaintPiece(_dragElement.className[2]);
}

function doMoveHandler(move, copy) {
    updateTooltip("");
    var oldfen = getCurFEN();
    var pos = parseFEN(oldfen);
    var legal = copy == null && isLegal(pos, move.from, move.to) && _curmoves.length > 0;
    if (legal) {
        var san = getCurSan(move);
        if (pos.w != _play) pos = doMove(pos, move.from, move.to, move.p);
        historyAdd(oldfen);
        setCurFEN(generateFEN(pos));
        historyAdd(getCurFEN(), null, move, san);
        showBoard(getCurFEN() == oldfen);
        doComputerMove();
    } else if (isEdit() && (move.from.x != move.to.x || move.from.y != move.to.y)) {
        if (copy && bounds(move.to.x, move.to.y)) {
            pos.b[move.to.x][move.to.y] = copy;
        } else if (!copy && bounds(move.from.x, move.from.y)) {
            if (bounds(move.to.x, move.to.y)) pos.b[move.to.x][move.to.y] = pos.b[move.from.x][move.from.y];
            pos.b[move.from.x][move.from.y] = '-';
        } else return false;
        fixCastling(pos);
        historyAdd(oldfen);
        setCurFEN(generateFEN(pos));
        historyAdd(getCurFEN());
        showBoard(getCurFEN() == oldfen);
    } else return false;
    return true;
}

function onMouseMove(e) {
    defaultMouseMove(e);
    if (document.onmousemove != onMouseMove && isEdit() && getPaintPiece() != 'S') paintMouse(e, getPaintPiece());
    if (_dragElement == null) return;
    if (e == null) e = window.event;
    if (!_dragActive) {
        if (Math.abs(e.clientX - _startX) < 8 && Math.abs(e.clientY - _startY) < 8) return;
        if (_dragLMB > 0) {
            var x1 = getDragX(_startX),
                y1 = getDragY(_startY),
                x2 = getDragX(e.clientX),
                y2 = getDragY(e.clientY);
            showArrow3({
                from: {
                    x: x1,
                    y: y1
                },
                to: {
                    x: x2,
                    y: y2
                }
            });
            _dragLMB = 2;
            return;
        }
        if ('PNBRQK'.indexOf(_dragElement.className[2].toUpperCase()) < 0) return;
        dragActivate();
    }

    _dragElement.style.left = (e.clientX * _bodyScale - 20) + 'px';
    _dragElement.style.top = (getClientY(e) - 20) + 'px';
    _dragElement.style.color = 'transparent';
    setElemText(_dragElement, '-'); // force browser to refresh pop-up
}

function onMouseUp(e) {
    if (document.onmousemove == graphMouseMove) return;
    onMouseMove(e);
    if (!_dragActive && _clickFrom != null && _clickFromElem != null && _clickFromElem.className.indexOf(" h0") > 0 && _dragLMB == 0) {
        var oldDragElement = _dragElement;
        _dragElement = _clickFromElem;
        var x2 = getDragX(e.clientX);
        var y2 = getDragY(e.clientY);
        _dragElement = null;
        if (!doMoveHandler({
                from: _clickFrom,
                to: {
                    x: x2,
                    y: y2
                }
            })) _dragElement = oldDragElement;
    }
    if (_dragElement != null) {
        var x1 = getDragX(_startX),
            y1 = getDragY(_startY);
        var x2 = getDragX(e.clientX),
            y2 = getDragY(e.clientY);
        if (_dragActive) {
            if (!doMoveHandler({
                    from: {
                        x: x1,
                        y: y1
                    },
                    to: {
                        x: x2,
                        y: y2
                    }
                }, _dragCtrl ? _dragElement.className[2] : null)) {
                showBoard(true);
            } else {
                if (!bounds(x1, y1)) setPaintPiece('S');
            }
        } else {
            var ew1br = document.getElementById('editWrapper').children[0].children[0].getBoundingClientRect();
            var ew1w = ew1br.width;
            if (_dragElement.parentNode.id != 'chessboard1') {
                x1 = -Math.round((e.clientX - ew1br.left - (ew1w / 2)) / ew1w) - 1;
                y1 = -Math.round((e.clientY - ew1br.top - (ew1w / 2)) / ew1w) - 1;
                if (_dragElement.parentNode.className != "cb" || x1 > 0 || y1 > 0) x1 = y1 = -99;
            }
            if (e.which === 3 || e.button === 2) {
                if (_dragElement.parentNode.id == 'chessboard1') {
                    if (_dragLMB == 1) {
                        var c = _dragElement.className;
                        _dragElement.className = c.split(' ')[0] + " " + c.split(' ')[1] +
                            (c.indexOf(" h0") >= 0 ? " h0" : "") +
                            (c.indexOf(" h1") >= 0 ? " h1" : "") +
                            (c.indexOf(" h2") >= 0 ? " h2" : "") +
                            (c.indexOf(" h3") < 0 ? " h3" : "");
                    }
                    finalArrow3();
                } else {
                    var list = document.getElementById('editWrapper').children[0].children,
                        p = null;
                    for (var i = 0; i < list.length; i++) {
                        var x1c = -Math.round((list[i].getBoundingClientRect().left - ew1br.left) / ew1w) - 1;
                        var y1c = -Math.round((list[i].getBoundingClientRect().top - ew1br.top) / ew1w) - 1;
                        if (list[i].className != null && x1c == x1 && y1c == y1) p = list[i].className[2];
                    }
                    if (p != null) {
                        if (p == 'S') setCurFEN(START);
                        else if (p == '-') setCurFEN("8/8/8/8/8/8/8/8 w - - 0 0");
                        else {
                            var pos = parseFEN(getCurFEN());
                            for (var x = 0; x < 8; x++)
                                for (var y = 0; y < 8; y++)
                                    if (pos.b[x][y] == p) pos.b[x][y] = '-';
                            fixCastling(pos);
                            setCurFEN(generateFEN(pos));
                        }
                        historySave();
                        showBoard();
                    }
                }
            } else if (_clickFrom != null &&
                _clickFromElem != null &&
                _clickFromElem.className.indexOf(" h0") > 0 &&
                _clickFrom.x == x1 &&
                _clickFrom.y == y1 ||
                _dragElement.className[2] == '-' && _dragElement.parentNode.id == 'chessboard1') {
                showLegalMoves(null);
            } else {
                showLegalMoves({
                    x: x1,
                    y: y1
                });
            }
        }
    } else {
        if (_clickFrom == null || _clickFrom.x > 0 && _clickFrom.y > 0 || (_clickFromElem != null && _clickFromElem.className[2] == 'S' && (e.which === 1 || e.button === 0))) showLegalMoves(null);
    }
    document.onmousemove = defaultMouseMove;
    document.onselectstart = null;
    _dragElement = null;

}

function onWheel(e) {
    if (_menu) showHideMenu(false);
    if (e.ctrlKey) return;
    if (isEdit()) {
        var p = getPaintPiece();
        var str = 'Spnbrqk-PNBRQK';
        var index = str.indexOf(p);
        if (index >= 0) {
            if (e.deltaY < 0) index--;
            if (e.deltaY > 0) index++;
            if (index < 0) index = str.length - 1;
            if (index == str.length) index = 0;
            setPaintPiece(str[index]);
        }

    } else {
        if (e.deltaY < 0) historyMove(-1);
        if (e.deltaY > 0) historyMove(+1);
    }
    e.preventDefault();
}

function setPaintPiece(newp) {
    var list = document.getElementById('editWrapper').children[0].children,
        newe = null;
    for (var i = 0; i < list.length; i++) {
        if (list[i].className != null && list[i].className[2] == newp) newe = list[i];
    }
    if (newe != null) {
        var x2 = -Math.round(parseFloat(newe.style.left.replace("px", "")) / 40) - 1;
        var y2 = -Math.round(parseFloat(newe.style.top.replace("px", "")) / 40) - 1;
        showLegalMoves({
            x: x2,
            y: y2
        });
    }
}

function getPaintPiece() {
    var list = document.getElementById('editWrapper').children[0].children;
    for (var i = 0; i < list.length; i++) {
        if (list[i].className != null && list[i].className.indexOf(" h0") > 0) return list[i].className[2];
    }
    return 'S';
}

function isEdit() {
    return _clickFrom != null && _clickFromElem != null && _clickFromElem.className.indexOf(" h0") > 0 && _clickFrom.x < 0 && _clickFrom.y < 0;
}

function paintMouse(e, p) {
    if (e == null) e = window.event;
    var elem = target = e.target != null ? e.target : e.srcElement;
    if (elem.parentNode == null || elem.parentNode.id != 'chessboard1') return;
    var w = elem.getBoundingClientRect().width;
    var h = elem.getBoundingClientRect().height;
    var offsetX = document.getElementById('chessboard1').getBoundingClientRect().left + w / 2;
    var offsetY = document.getElementById('chessboard1').getBoundingClientRect().top + h / 2;
    var x1 = Math.round((e.clientX - offsetX) / w);
    var y1 = Math.round((e.clientY - offsetY) / h);
    if (_flip) {
        x1 = 7 - x1;
        y1 = 7 - y1;
    }
    if (bounds(x1, y1) && (_clickFromElem != null && _clickFromElem.className.indexOf(" h0") > 0 || (e.which === 3 || e.button === 2))) {

        var pos = parseFEN(getCurFEN());
        var newp = null;
        if (e.ctrlKey || (e.which === 3 || e.button === 2)) newp = '-';
        else newp = p != null ? p : _clickFromElem.className[2];
        pos.b[x1][y1] = newp;
        fixCastling(pos);
        setCurFEN(generateFEN(pos));
        historySave();
        showBoard(null, null, true);
        if (p == null) {
            document.onmousemove = function(event) {
                paintMouse(event, newp);
            };
        }
    } else document.onmousemove = defaultMouseMove;
}

function onKeyDown(e) {
    var k = e.keyCode || e.which;
    if (e.ctrlKey) return;
    var c = String.fromCharCode(e.keyCode || e.which).replace(" ", "-");
    if (k == 96 || k == 106) {
        if (_engine != null && _engine.ready) command("depth " + (_engine.depth != 0 ? "0" : "15"));
    } else if (k == 107) {
        if (_engine != null && _engine.ready) command("depth " + Math.min(128, _engine.depth + 1));
    } else if (k == 109) {
        if (_engine != null && _engine.ready) command("depth " + Math.max(0, _engine.depth - 1));
    } else if (k == 38 || k == 37) historyMove(-1);
    else if (k == 33) historyMove(-10);
    else if (k == 36) historyMove(-1, null, true);
    else if (k == 40 || k == 39) historyMove(+1);
    else if (k == 34) historyMove(+10);
    else if (k == 35) historyMove(+1, null, true);
    else if (c == 'R') showBoard(false, true);
    else if (k == 27) command("revert");
    else if (c == 'F') command("flip");
    else if (c == 'T') command("sidetomove");
    else if (c == 'T2') command("sidetomove2");
    else if (c == 'C') showHideWindow("Chessboard");
    else if (c == 'M') showHideWindow("Moves");
    else if (c == 'H') showHideWindow("History");
    else if (c == 'G') showHideWindow("Graph");
    else if (c == 'O') showHideWindow("Opening");
    else if (c == 'S') showHideWindow("Static");
    else if (c == 'L') showHideWindow("Lczero");
    else if (c == 'E') showHideWindow("Edit");
    else if (c == '1') menuAnalysisMode();
    else if (c == '2') menuPlayEngineWhite();
    else if (c == '3') menuPlayEngineBlack();
    else if (c == '4') menuTwoPlayerMode();
    else if (c == '5') menuTwoEngineMode();
}

// Evaluation engine
var myWorker = null,
    URL = window.URL || (window.webkitURL);
window.URL = URL;

function loadEngine() {
    var engine = {
        ready: false,
        kill: false,
        waiting: true,
        depth: 15,
        lastnodes: 0
    };
    var wasmSupported = typeof WebAssembly === 'object' && WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
    if (typeof(Worker) === "undefined") return engine;
    var workerData = new Blob([atob(wasmSupported ? sfWasm : sf)], {
        type: "text/javascript"
    });
    try {
        var worker = new Worker(window.URL.createObjectURL(workerData));
    } catch (err) {
        return engine;
    }
    worker.onmessage = function(e) {
        if (engine.messagefunc) engine.messagefunc(e.data);
    }
    engine.send = function send(cmd, message) {
        cmd = String(cmd).trim();
        engine.messagefunc = message;
        worker.postMessage(cmd);
    };
    engine.eval = function eval(fen, done, info) {
        engine.send("position fen " + fen);
        engine.send("go depth " + engine.depth, function message(str) {
            var matches = str.match(/depth (\d+) .*score (cp|mate) ([-\d]+) .*nodes (\d+) .*pv (.+)/);
            if (!matches) matches = str.match(/depth (\d+) .*score (cp|mate) ([-\d]+).*/);
            if (matches) {
                if (engine.lastnodes == 0) engine.fen = fen;
                if (matches.length > 4) {
                    var nodes = Number(matches[4]);
                    if (nodes < engine.lastnodes) engine.fen = fen;
                    engine.lastnodes = nodes;
                }
                var depth = Number(matches[1]);
                var type = matches[2];
                var score = Number(matches[3]);
                if (type == "mate") score = (1000000 - Math.abs(score)) * (score <= 0 ? -1 : 1);
                engine.score = score;
                if (matches.length > 5) {
                    var pv = matches[5].split(" ");
                    if (info != null && engine.fen == fen) info(depth, score, pv);
                }
            }
            if (str.indexOf("bestmove") >= 0 || str.indexOf("mate 0") >= 0 || str == "info depth 0 score cp 0") {
                if (engine.fen == fen) done(str);
                engine.lastnodes = 0;
            }
        });
    };
    engine.send("uci", function onuci(str) {
        if (str === "uciok") {
            engine.send("isready", function onready(str) {
                if (str === "readyok") engine.ready = true;
            });
        }
    });
    return engine;
}

function addHistoryEval(index, score, depth, move) {
    if (_history[index].length < 2 || _history[index][1] == null || (_history[index][1] != null && _history[index][1].depth < depth)) {
        var black = _history[index][0].indexOf(" b ") > 0;
        var ei = {
            score: score,
            depth: depth,
            black: black,
            move: move
        };
        if (_history[index].length >= 2) _history[index][1] = ei;
        else {
            _history[index].push(ei);
            _history[index].push(null);
        }
        repaintGraph();
        _wantUpdateInfo = true;
    }
}

function evalNext() {
    for (var i = 0; i < _curmoves.length; i++) {
        if (_curmoves[i].depth < _engine.depth) {
            var curpos = _curmoves[i].fen;
            _engine.score = null;
            if (!_engine.waiting) return;
            _engine.waiting = false;
            var initialdepth = _engine.depth;
            var savedpv = [];
            _engine.eval(curpos, function done(str) {
                _engine.waiting = true;
                if (i >= _curmoves.length || _curmoves[i].fen != curpos) return;
                if (_engine.score != null && _engine.depth == initialdepth) {
                    _curmoves[i].eval = _curmoves[i].w ? _engine.score : -_engine.score;
                    _curmoves[i].depth = _engine.depth;
                    var m = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
                    _curmoves[i].answer = (m && m.length > 1 && m[1] != null && (m[1].length == 4 || m[1].length == 5)) ? m[1] : null;
                    _curmoves[i].answerpv = [];
                    var pvtext = "";
                    if (_curmoves[i].answer != null) {
                        if (savedpv.length < 1 || savedpv[0] != m[1]) savedpv = [m[1]];
                        if (m.length > 2 && m[2] != null && m[2].length != 4 && m[2].length != 5) {
                            if (savedpv.length < 2 || savedpv[1] != m[2]) savedpv = [m[1], m[2]];
                        }
                        var nextpos = parseFEN(curpos);
                        for (var j = 0; j < savedpv.length; j++) {
                            if (pvtext.length > 0) pvtext += " ";
                            var move = parseBestMove(savedpv[j]);
                            pvtext += sanMove(nextpos, move, genMoves(nextpos));
                            _curmoves[i].answerpv.push(savedpv[j]);
                            if (j + 1 < savedpv.length) nextpos = doMove(nextpos, move.from, move.to, move.p);
                        }
                    }
                    _curmoves[i].pvtext = pvtext.length > 0 ? pvtext : "-";
                    showEvals();
                }
                if (!_engine.kill) evalNext();
            }, function info(depth, score, pv) {
                savedpv = pv;
            });
            return;
        }
    }
    if (_curmoves.length > 0 && _history[_historyindex][0] == getCurFEN()) addHistoryEval(_historyindex, _curmoves[0].w ? -_curmoves[0].eval : _curmoves[0].eval, _engine.depth, _curmoves[0].move);
    for (var i = _history.length - 1; i >= 0; i--) {
        if (_history[i].length < 2 || _history[i][1] == null || (_history[i][1] != null && _history[i][1].depth < _engine.depth - 1)) {
            var curpos = _history[i][0];
            _engine.score = null;
            if (!_engine.waiting) return;
            if (checkPosition(parseFEN(curpos)).length > 0) {
                addHistoryEval(i, null, _engine.depth - 1);
                if (!_engine.kill) evalNext();
            } else {
                _engine.waiting = false;
                _engine.eval(curpos, function done(str) {
                    _engine.waiting = true;
                    if (i >= _history.length || _history[i][0] != curpos) return;
                    if (_engine.score != null) {
                        var m = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
                        var answer = (m && m.length > 1 && (m[1].length == 4 || m[1].length == 5)) ? m[1] : null;
                        addHistoryEval(i, _engine.score, _engine.depth - 1, parseBestMove(answer));
                    }
                    if (!_engine.kill) evalNext();
                });
            }
            return;
        }
    }
    historySave();
}

function applyEval(m, s, d) {
    if (s == null || m.length < 4 || _engine.depth == 0) return;
    for (var i = 0; i < _curmoves.length; i++) {
        if (_curmoves[i].move.from.x == "abcdefgh".indexOf(m[0]) &&
            _curmoves[i].move.from.y == "87654321".indexOf(m[1]) &&
            _curmoves[i].move.to.x == "abcdefgh".indexOf(m[2]) &&
            _curmoves[i].move.to.y == "87654321".indexOf(m[3])) {
            if (d > _curmoves[i].depth) {
                _curmoves[i].eval = _curmoves[i].w ? -s : s;
                _curmoves[i].depth = d;
                showEvals();
            }
            break;
        }
    }
}

function parseBestMove(m) {
    if (m == null || m.length < 4) return null;
    var from = {
        x: "abcdefgh".indexOf(m[0]),
        y: "87654321".indexOf(m[1])
    };
    var to = {
        x: "abcdefgh".indexOf(m[2]),
        y: "87654321".indexOf(m[3])
    };
    var p = m.length > 4 ? "nbrq".indexOf(m[4]) : -1;
    if (p < 0) return {
        from: from,
        to: to
    };
    return {
        from: from,
        to: to,
        p: "NBRQ" [p]
    };
}

function evalAll() {
    if (_play != null) return;
    if (_engine == null || !_engine.ready || !_engine.waiting) {
        if (_engine) _engine.kill = true;
        window.setTimeout(evalAll, 50);
        return;
    }
    _engine.kill = false;
    _engine.waiting = false;
    for (var i = 0; i < _curmoves.length; i++) {
        _curmoves[i].eval = null;
        _curmoves[i].depth = null;
    }
    if (_engine.depth == 0) {
        _engine.waiting = true;
        return;
    }
    var fen = getCurFEN();
    _engine.send("stop");
    _engine.send("ucinewgame");
    _engine.send("setoption name Skill Level value 20");
    _engine.score = null;
    if (_curmoves.length == 0) {
        _engine.waiting = true;
        if (!_engine.kill) evalNext();
        return;
    }
    _engine.eval(fen, function done(str) {
        _engine.waiting = true;
        if (fen != getCurFEN()) return;
        var matches = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
        if (matches && matches.length > 1) {
            applyEval(matches[1], _engine.score, _engine.depth - 1);
            if (_history[_historyindex][0] == fen) addHistoryEval(_historyindex, _engine.score, _engine.depth - 1, parseBestMove(matches[1]));
        }
        if (!_engine.kill) evalNext();
    }, function info(depth, score, pv) {
        if (fen != getCurFEN() || depth <= 10) return;
        applyEval(pv[0], score, depth - 1);
        if (_history[_historyindex][0] == fen) addHistoryEval(_historyindex, score, depth - 1, parseBestMove(pv[0]));
    });
}

function doComputerMove() {
    if (_play == null) return;
    var fen = getCurFEN();

    if (_isPlayerWhite == true && fen.indexOf(" w ") > 0) return;getCurFEN

    if (_isPlayerWhite == false && fen.indexOf(" b ") > 0) return;

    if (_engine != null && !_engine.waiting) {
        if (_engine) _engine.kill = true;
        window.setTimeout(function() {
            doComputerMove();
        }, 50);
        return;
    }
    if (_engine == null || !_engine.ready || _engine.depth == 0) {
        if (_curmoves.length == 0) return;
        var move = _curmoves[Math.floor(Math.random() * _curmoves.length)].move;
        var san = getCurSan(move);
        var pos = doMove(parseFEN(fen), move.from, move.to, move.p);
        historyAdd(fen);
        setCurFEN(generateFEN(pos));
        historyAdd(getCurFEN(), null, move, san);
        updateTooltip("");
        showBoard(false);
    } else {
        _engine.kill = false;
        _engine.waiting = false;
        _engine.send("stop");
        _engine.send("ucinewgame");
        _engine.send("setoption name Skill Level value " + (_engine.depth - 1));
        _engine.score = null;
        _engine.eval(fen, function done(str) {
            _engine.waiting = true;
            if (fen != getCurFEN()) return;
            var matches = str.match(/^bestmove\s(\S+)(?:\sponder\s(\S+))?/);
            if (matches && matches.length > 1) {
                var move = parseBestMove(matches[1]);
                var san = getCurSan(move);
                var pos = doMove(parseFEN(fen), move.from, move.to, move.p);
                historyAdd(fen);
                setCurFEN(generateFEN(pos));
                historyAdd(getCurFEN(), null, move, san);
                updateTooltip("");
                showBoard(false);
            }
        });
    }
}

// Evaluation graph

var _lastMouseDataPos = null;

function getGraphPointData(i) {
    var e = null,
        black = false;
    if (_engine == null || _engine.depth == 0) return 0;
    if (i >= 0 && i < _history.length && _history[i].length >= 2 && _history[i][1] != null && _history[i][1].score != null) {
        black = _history[i][1].black;
        e = _history[i][1].score / 100;
        if (black) e = -e;
        if ((e || 0) > 10) e = 10;
        else if ((e || 0) < -10) e = -10;
    }
    return e;
}

function getGraphPointColor(i) {
    var e = getGraphPointData(i),
        laste = getGraphPointData(i - 1);
    black = i >= 0 && i < _history.length && _history[i].length >= 2 && _history[i][1] != null && _history[i][1].score != null && _history[i][1].black;
    var lost = laste == null || e == null ? 0 : black ? (laste - e) : (e - laste);
    return lost <= 1.0 ? "#008800" : lost <= 3.0 ? "#bb8800" : "#bb0000";
}

function showGraphTooltip(i, event) {
    if (i >= 0 && i < _history.length && _history[i] != null && _history[i].length > 3 && _history[i][3] != null) {
        var pos = parseFEN(_history[i][0]);
        var evalText = _history[i][3];
        if (_history[i][1] != null && _history[i][1].score != null) {
            var e = _history[i][1].score;
            if (_history[i][1].black) e = -e;
            evalText += " " + getEvalText(e, true);
        }
        updateTooltip(evalText, null, (pos.w ? (pos.m[1] - 1) + "..." : pos.m[1] + "."), null, event);
    } else updateTooltip("");
}

function setupMobileLayout(init) {
    if (init) {
        document.getElementById('colLeft').style.width = "300px";
        document.getElementById('colRight').style.width = "300px";
        document.getElementById('wChessboard').style.margin = "8px 0 0 0";
        document.getElementById('wChessboard').style.resize = "none";
        document.getElementById('wGraph').style.display = "none";
        document.getElementById('wHistory').style.display = "none";
        document.getElementById('wMoves').style.height = "121px";
        document.getElementById('logo').style.height = "20px";
        document.getElementById('logo').style.padding = "0";
        document.getElementById('logo').style.transform = "scale(0.5)";
        document.getElementById('logo').style.transformOrigin = "top left";
        document.getElementById('logotextmain').style.top = "8px";
        document.getElementById('logotextmain').style.left = "75px";
        document.getElementById('logotextsub').style.top = "37px";
        document.getElementById('logotextsub').style.left = "75px";
        document.getElementById('toolbar').style.transform = "scale(2.3)";
        document.getElementById('toolbar').style.transformOrigin = "top left";
        document.getElementById('toolbar').style.top = "-2px";
        document.getElementById('toolbar').style.left = "345px";
        document.getElementById('toolbar').style.width = "112px";
        document.getElementById('wb').style.transform = "scale(2)";
        document.getElementById('wb').style.transformOrigin = "top left";
        document.getElementById('positionInfo').style.display = "none";
        document.getElementById('searchWrapper').style.top = "0";
        document.getElementById('searchWrapper').style.height = "24px";
        document.getElementById('searchInput').style.padding = "4px 4px 3px 4px";
        document.getElementById('boxBoardOuter').style.marginTop = "31px";
        document.getElementById('moves').style.bottom =
            document.getElementById('history').style.bottom =
            document.getElementById('opening').style.bottom =
            document.getElementById('static').style.bottom =
            document.getElementById('lczero').style.bottom = "6px";
        document.getElementById('buttonGo').style.padding = "3px 4px 5px 4px";
        document.getElementById('buttonGo').style.top = "0";
        document.getElementById('movesFooter').style.height = document.getElementById('lczeroFooter').style.height = "6px";
        document.getElementById('movesFooter').style.lineHeight = document.getElementById('lczeroFooter').style.lineHeight = "6px";
        document.getElementById('movesFooter').style.fontSize = document.getElementById('lczeroFooter').style.fontSize = "5px";
        document.getElementById('movesFooter').style.fontWeight = document.getElementById('lczeroFooter').style.fontWeight = "500";
    }
    var winWidth = Math.min(window.innerWidth, window.outerWidth);
    var winHeight = Math.min(window.innerHeight, window.outerHeight);
    var horiz = winWidth > winHeight;
    var width = horiz ? 660 : 320;
    var scale = winWidth / width;
    _bodyScale = 1 / scale;
    var height = horiz ? Math.max(280, Math.min(504, winHeight / scale)) : Math.max(490, winHeight / scale);
    document.body.style.display = "flex";
    document.body.style.transformOrigin = "top left";
    document.body.style.transform = "scale(" + (scale) + ")";
    document.body.style.width = width + "px";
    document.body.style.height = height + "px";
    document.body.style.overflowX = "hidden";
    document.getElementById('container').style.width = width + "px";
    document.getElementById('container').style.height = height + "px";

    document.getElementById('logo').style.position = horiz ? "absolute" : "";
    document.getElementById('logo').style.top = horiz ? "0" : "";
    document.getElementById('logo').style.left = horiz ? "355px" : "";
    document.getElementById('wChessboard').style.width = horiz ? "310px" : "";
    document.getElementById('wChessboard').style.height = (horiz ? height - 16 : 300) + "px";
    document.getElementById('wb').style.top = horiz ? "0" : "329px";
    document.getElementById('wb').style.right = horiz ? "324px" : "162px";
    document.getElementById('wb').style.width = horiz ? "21px" : "";
    document.getElementById('wb').style.height = horiz ? "120px" : "";
    document.getElementById('colLeft').style.minWidth = horiz ? "300px" : "";
    document.getElementById('colLeft').style.minHeight = horiz ? "1px" : "338px";
    document.getElementById('colLeft').style.paddingBottom = horiz ? "" : "24px";
    document.getElementById('colLeft').style.marginLeft = horiz ? "5px" : "10px";
    document.getElementById('colRight').style.marginLeft = horiz ? "45px" : "10px";
    document.getElementById('colRight').style.marginTop = horiz ? "29px" : "";

    var elems = document.getElementById("colRight");
    for (var i = 0; i < elems.children.length; i++) {
        var div = elems.children[i];
        if (div.tagName != 'DIV' || div.className != "box") continue;
        div.style.height = (horiz ? 243 + height - 280 : 121 + height - 490) + "px";
        div.style.margin = "0";
        div.style.resize = "none";
    }
}

function checkSizes() {
    if (_mobile && (document.activeElement == null || document.activeElement.tagName != "INPUT")) setupMobileLayout(false);

    // Graph
    var cw = document.getElementById("graphWrapper").clientWidth;
    var ch = document.getElementById("graphWrapper").clientHeight;
    var canvas = document.getElementById("graph");
    if (canvas.width != cw || canvas.height != ch) repaintGraph();


    // Chessboard
    var targetScale = Math.round(getCurScale() * 1000) / 1000;
    var targetMargin = ((document.getElementById("wChessboard").clientWidth - (document.getElementById("boxBoard").clientWidth + 4) * targetScale) / 2) - 0.5;
    var oldScale = parseFloat(document.getElementById("boxBoard").style.transform.replace("scale(", "").replace(")", ""));
    var oldMargin = parseFloat(document.getElementById("boxBoardOuter").style.marginLeft.replace("px", ""));
    if (Math.round(oldScale * 1000) != Math.round(targetScale * 1000) ||
        Math.round(oldMargin) != Math.round(targetMargin)) {
        document.getElementById("boxBoard").style.transform = "scale(" + targetScale + ")";
        document.getElementById("boxBoardOuter").style.marginLeft =
            document.getElementById("boxBoardOuter").style.marginRight = targetMargin + "px";
    }

    if (_wantUpdateInfo) {
        _wantUpdateInfo = false;
        updateInfo();
    }

}

function repaintGraph(event) {
    var data = [];
    var color = [];
    var laste = null;
    for (var i = 0; i < _history.length; i++) {
        data.push(getGraphPointData(i));
        color.push(getGraphPointColor(i));
    }
    var border1 = 4.5,
        border2 = 18.5;
    var xMax = 40,
        yMax = 2,
        xStep = 10,
        yStep = 1;
    for (var i = 0; i < data.length; i++)
        if (Math.ceil(Math.abs(data[i])) > yMax) yMax = Math.ceil(Math.abs(data[i]));
    if (data.length > xMax) xMax = data.length;
    var cw = document.getElementById("graphWrapper").clientWidth;
    var ch = document.getElementById("graphWrapper").clientHeight;
    if (event != null) {
        var rect = document.getElementById("graph").getBoundingClientRect();
        var mx = event.clientX - rect.left;
        var my = event.clientY - rect.top;
        var mouseDataPos = null;
        var b1 = border1 / _bodyScale,
            b2 = border2 / _bodyScale;
        var mUnit = (rect.width - b1 - b2) / xMax;
        if (mx > b2 + mUnit / 2 && mx < rect.width - b1 + mUnit / 2 && my > b1 && my < rect.height - b2) {
            mouseDataPos = Math.round((mx - b2) / mUnit) - 1;
        }
        if (mouseDataPos == _lastMouseDataPos) return;
        _lastMouseDataPos = mouseDataPos;
    } else _lastMouseDataPos = mouseDataPos;

    var canvas = document.getElementById("graph");
    var ctx = canvas.getContext("2d");
    canvas.width = cw;
    canvas.height = ch;
    var yTotal = canvas.height - border1 - border2,
        xTotal = canvas.width - border1 - border2;
    var xUnit = xTotal / (xMax / xStep),
        yUnit = yTotal / (yMax * 2 / yStep);
    if (yUnit > 0)
        while (yUnit < 12) {
            yUnit *= 2;
            yStep *= 2;
        }
    if (xUnit > 0)
        while (xUnit < 18) {
            xUnit *= 2;
            xStep *= 2;
        }

    ctx.font = "10px Segoe UI";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#a0aab4";
    ctx.fillText("0", border2 - 6, border1 + yTotal / 2);
    ctx.beginPath();
    ctx.strokeStyle = "#738191";
    for (var i = yStep; i <= yMax; i += yStep) {
        if (i == 0) continue;
        var y = Math.round(i * yUnit / yStep);
        ctx.fillText("+" + i, border2 - 6, border1 + yTotal / 2 - y);
        ctx.fillText("-" + i, border2 - 6, border1 + yTotal / 2 + y);
        if (i < yMax) {
            ctx.moveTo(border2, border1 + yTotal / 2 - y);
            ctx.lineTo(border2 + xTotal, border1 + yTotal / 2 - y);
            ctx.moveTo(border2, border1 + yTotal / 2 + y);
            ctx.lineTo(border2 + xTotal, border1 + yTotal / 2 + y);
        }
    }
    ctx.moveTo(border2, border1);
    ctx.lineTo(border2 + xTotal, border1);
    ctx.stroke();
    ctx.beginPath();

    ctx.textAlign = "center";
    ctx.strokeStyle = "#a0aab4";
    for (var i = 0; i <= xMax; i += xStep) {
        var x = Math.round(i * xUnit / xStep);
        ctx.fillText(i / 2, border2 + x, border1 + yTotal + border2 / 2 + 2);
        ctx.moveTo(border2 + x, border1 + yTotal);
        ctx.lineTo(border2 + x, border1 + yTotal + 3);
    }
    for (var i = 0; i <= yMax; i += yStep) {
        var y = Math.round(i * yUnit / yStep);
        ctx.moveTo(border2 - 3, border1 + yTotal / 2 - y);
        ctx.lineTo(border2, border1 + yTotal / 2 - y);
        ctx.moveTo(border2 - 3, border1 + yTotal / 2 + y);
        ctx.lineTo(border2, border1 + yTotal / 2 + y);
    }

    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(border2, border1);
    ctx.lineTo(border2, border1 + yTotal);
    ctx.moveTo(border2, border1 + yTotal);
    ctx.lineTo(border2 + xTotal, border1 + yTotal);
    ctx.moveTo(border2, border1 + yTotal / 2);
    ctx.lineTo(border2 + xTotal, border1 + yTotal / 2);

    ctx.stroke();

    for (var i = 1; i < data.length; i++) {
        if (data[i] != null && data[i - 1] != null) {
            if (color[i] != "#008800") {
                ctx.beginPath();
                ctx.strokeStyle = color[i] == "#bb0000" ? "red" : "white";
                ctx.lineWidth = 1;
                ctx.moveTo(border2 + i * (xUnit / xStep), border1 + yTotal / 2 - data[i - 1] * (yUnit / yStep));
                ctx.lineTo(border2 + (i + 1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep));
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.strokeStyle = "black";
                ctx.lineWidth = 1;
                ctx.moveTo(border2 + i * (xUnit / xStep), border1 + yTotal / 2 - data[i - 1] * (yUnit / yStep));
                ctx.lineTo(border2 + (i + 1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep));
                ctx.stroke();
            }
        }
    }
    var i;
    for (i = 0; i < data.length; i++) {
        if (i != mouseDataPos && i != _historyindex) {
            ctx.beginPath();
            ctx.arc(border2 + (i + 1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep), 2, 0, 2 * Math.PI, false);
            ctx.fillStyle = 'black';
            ctx.fill();
        }
    }

    i = _historyindex;
    ctx.beginPath();
    ctx.arc(border2 + (i + 1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep), 4, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'black';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(border2 + (i + 1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep), 2, 0, 2 * Math.PI, false);
    ctx.fillStyle = '#e1e2e6';
    ctx.fill();

    i = mouseDataPos;
    ctx.beginPath();
    ctx.arc(border2 + (i + 1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep), 4, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'black';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(border2 + (i + 1) * (xUnit / xStep), border1 + yTotal / 2 - data[i] * (yUnit / yStep), 2, 0, 2 * Math.PI, false);
    ctx.fillStyle = '#64c4db';
    ctx.fill();

    if (event) showGraphTooltip(mouseDataPos, event);
    repaintLastMoveArrow();
}

function defaultMouseMove(event) {
    if (_tooltipState) updateTooltipPos(event);
}

function graphMouseMove(event) {
    repaintGraph(event);
    if (_tooltipState) updateTooltipPos(event);
}

function graphMouseDown(event) {
    if (_lastMouseDataPos != null) {
        var i = _lastMouseDataPos;
        if (i < _history.length && i >= 0 && i != _historyindex) {
            historyMove(i - _historyindex);
        }
    }
}

// Sidebars

function repaintSidebars() {
    var pos = parseFEN(getCurFEN());
    var whitemat = [],
        blackmat = [],
        points = 0;
    for (var x = 0; x < 8; x++)
        for (var y = 0; y < 8; y++) {
            var p = board(pos, x, y).toLowerCase();
            var col = board(pos, x, y) != p;
            var index = "pnbrqk".indexOf(p);
            if (index >= 0) {
                if (col) whitemat.push(index);
                else blackmat.push(index);
                points += (col ? 1 : -1) * [1, 3, 3, 5, 9, 0][index];
            }
        }
    whitemat.sort();
    blackmat.sort();
    for (var i = 0, j = 0; i < whitemat.length && j < blackmat.length;) {
        if (whitemat[i] == blackmat[j]) {
            whitemat.splice(i, 1);
            blackmat.splice(j, 1);
        } else if (whitemat[i] < blackmat[j]) i++;
        else if (whitemat[i] > blackmat[j]) j++;
    }
    var elem = document.getElementById("materialWrapper");
    while (elem.firstChild) elem.removeChild(elem.firstChild);
    var fmat = function(mat, flip) {
        for (var i = 0; i < mat.length; i++) {
            var node1 = document.createElement("DIV");
            node1.className = "pnbrqk" [mat[i]];
            var d = (mat.length - 1 - i) * 16 + "px";
            if (flip) node1.style.top = d;
            else node1.style.bottom = d;
            elem.appendChild(node1);
        }
    }
    if (points < 0) fmat(whitemat, _flip);
    fmat(blackmat, !_flip);
    if (points >= 0) fmat(whitemat, _flip);
    if (points != 0) {
        var node1 = document.createElement("DIV");
        node1.appendChild(document.createTextNode("+" + Math.abs(points)));
        var down = points > 0 && !_flip || points < 0 && _flip;
        var d = (_flip ^ down ? whitemat.length : blackmat.length) * 16 + "px";
        if (down) node1.style.bottom = d;
        else node1.style.top = d;
        elem.appendChild(node1);
    }

    elem = document.getElementById("namesWrapperTop");
    while (elem.firstChild) elem.removeChild(elem.firstChild);
    elem.appendChild(document.createTextNode(_flip ? _wname : _bname));
    elem = document.getElementById("namesWrapperBottom");
    while (elem.firstChild) elem.removeChild(elem.firstChild);
    elem.appendChild(document.createTextNode(_flip ? _bname : _wname));
}

// Buttons and menu

function refreshButtonRevert() {
    if (_history2 == null) {
        document.getElementById('buttonRevert').className = "off";
        document.getElementById('buttonRevert').onclick = null;
    } else {
        document.getElementById('buttonRevert').className = "on";
        document.getElementById('buttonRevert').onclick = function(e) {
            command(e.ctrlKey ? "keep" : "revert");
        };
    }
}

function refreshFlip() {
    var elem = document.getElementById('cbTable');
    for (var i = 0; i < 8; i++) {
        elem.children[0].children[0].children[1 + i].innerText =
            elem.children[0].children[9].children[1 + i].innerText = 'abcdefgh' [_flip ? 7 - i : i];
        elem.children[0].children[1 + i].children[0].innerText =
            elem.children[0].children[1 + i].children[i == 0 ? 2 : 1].innerText = '12345678' [_flip ? i : 7 - i];
    }
    showBoard(true);
}

function doFlip() {
    _flip = !_flip;
    refreshFlip();
    historySave();
}

function showHideWindow(name, targetState) {

    if (_mobile && name != "Chessboard") {
        var wb = document.getElementById("wb").children;
        var lparams = [];
        for (var i = 0; i < wb.length; i++) {
            if (wb[i].tagName != 'DIV') continue;
            var wbId = wb[i].id.substring(2);
            if (wbId == "Chessboard") continue;
            document.getElementById("w" + wbId).style.display = "none";
            var wbElem = document.getElementById("wb" + wbId);
            wbElem.className = wbElem.className.replace(" selected", "");
        }
    }
    var boxElem = document.getElementById("w" + name);
    var newState = targetState == null ? boxElem.style.display == "none" : targetState;
    boxElem.style.display = newState ? "" : "none";
    var wbElem = document.getElementById("wb" + name);
    wbElem.className = wbElem.className.replace(" selected", "") + (newState ? " selected" : "");
    checkSizes();
    if ((name == "Edit" || _mobile) && isEdit()) showLegalMoves(null);
    if (name == "Graph" && document.onmousemove == graphMouseMove) document.getElementById("graphWrapper").onmouseout();
    if (name == "Lczero" && newState) repaintLczero();
    if (name == "Static" && newState) repaintStatic();
}

function showHideMenu(state, e) {
    if (e != null) {
        var target = e.target != null ? e.target : e.srcElement;
        while (target != null && target.id != 'buttonMenu' && target.id != 'menu' && target.tagName != 'BODY') target = target.parentNode;
        if (target == null) return;
        if (!state && (target.id == 'buttonMenu' || target.id == 'menu')) return;
    }
    if (state) _menu = !_menu;
    else _menu = false;

    var bElem = document.getElementById("buttonMenu");
    var mElem = document.getElementById("menu");
    bElem.className = _menu ? "on down" : "on";
    mElem.style.top = (bElem.getBoundingClientRect().bottom - document.getElementById("container").getBoundingClientRect().top) * _bodyScale + "px";
    mElem.style.left = (bElem.getBoundingClientRect().left - document.getElementById("container").getBoundingClientRect().left) * _bodyScale + "px";
    mElem.style.right = "auto";
    if (_mobile) {
        mElem.style.left = "auto";
        mElem.style.right = (-bElem.getBoundingClientRect().right + document.getElementById("container").getBoundingClientRect().right - 1) * _bodyScale + "px";
    }
    mElem.style.display = _menu ? "" : "none";
    if (_menu) reloadMenu();
}

function setBoardColor(c) {
    var count = 6;
    if (c < 0) c = count - 1;
    if (c >= count) c = 0;
    document.getElementById("cbTable").className = "c" + c;
    document.getElementById("boxBoard").className = "c" + c;
    document.getElementById("chessboard1").className = "cb c" + c;
    var elem = document.getElementById("icolor");
    if (elem != null) elem.className = "c" + c;
    _color = c;
}

function setEngineValue(elem) {
    setElemText(elem, _engine != null && _engine.ready ? _engine.depth : "0");
    if (_engine != null && _engine.ready && _play != null) {
        var table = [0, 1000, 1100, 1200, 1300, 1450, 1600, 1750, 1900, 2050, 2150, 2250, 2350, 2450, 2550, 2650, 2700, 2800, 2900];
        elem.title = _engine.depth == 0 ? "Random play" : _engine.depth >= table.length ? "ELO: 3000+" : "ELO: " + table[_engine.depth];
    } else elem.removeAttribute("title");
}

function reloadMenu() {

    var parent = document.getElementById("menu");
    while (parent.firstChild) parent.removeChild(parent.firstChild);
    var addMenuLine = function() {
        var div = document.createElement('div');
        div.className = "menuLine";
        parent.appendChild(div);
    }
    var addMenuItem = function(className, text, key, enabled, func) {
        var div = document.createElement('div');
        div.className = "menuItem " + className;
        if (!enabled) div.className += " disabled";
        var span1 = document.createElement('span');
        setElemText(span1, text);
        div.appendChild(span1);
        var span2 = document.createElement('span');
        span2.className = "key";
        if (key != null) setElemText(span2, key);
        div.appendChild(span2);
        if (enabled) div.onclick = func;
        parent.appendChild(div);
    }
    var addMenuItemEngine = function(className, text) {
        var div = document.createElement('div');
        div.className = "menuItem " + className;
        var span1 = document.createElement('span');
        setElemText(span1, text);
        div.appendChild(span1);
        var span2 = document.createElement('span');
        span2.id = "buttonEnginePlus";
        span2.onclick = function() {
            if (_engine != null && _engine.ready) command("depth " + Math.min(50, _engine.depth + 1));
            showBoard(false, true);
            setEngineValue(document.getElementById("buttonEngineValue"));
        }
        div.appendChild(span2);
        var span3 = document.createElement('span');
        span3.id = "buttonEngineValue";
        span3.onclick = function() {
            if (_engine != null && _engine.ready) command("depth " + (_engine.depth != 0 ? "0" : "15"));
            showBoard(false, true);
            setEngineValue(document.getElementById("buttonEngineValue"));
        }
        setEngineValue(span3);

        div.appendChild(span3);
        var span4 = document.createElement('span');
        span4.id = "buttonEngineMinus";
        span4.onclick = function() {
            if (_engine != null && _engine.ready) command("depth " + Math.max(0, _engine.depth - 1));
            showBoard(false, true);
            setEngineValue(document.getElementById("buttonEngineValue"));
        }
        div.appendChild(span4);
        parent.appendChild(div);
    }
    var addMenuItemColor = function(className, text) {
        var div = document.createElement('div');
        div.className = "menuItem " + className;
        var span1 = document.createElement('span');
        setElemText(span1, text);
        div.appendChild(span1);

        var span2 = document.createElement('span');
        span2.id = "buttonColorNext";
        span2.onclick = function() {
            setBoardColor(_color + 1);
        }

        div.appendChild(span2);
        var div1 = document.createElement('div');
        div1.id = "icolor";
        div1.className = "c" + _color;
        div1.onclick = function() {
            setBoardColor(0);
        };
        var div2, div3 = document.createElement('div');
        div2 = document.createElement('div');
        div2.style.left = "0px";
        div2.style.top = "0px";
        div2.className = "l";
        div3.appendChild(div2);
        div2 = document.createElement('div');
        div2.style.left = "0px";
        div2.style.top = "5px";
        div2.className = "d";
        div3.appendChild(div2);
        div2 = document.createElement('div');
        div2.style.left = "5px";
        div2.style.top = "0px";
        div2.className = "d";
        div3.appendChild(div2);
        div2 = document.createElement('div');
        div2.style.left = "5px";
        div2.style.top = "5px";
        div2.className = "l";
        div3.appendChild(div2);
        div1.appendChild(div3);
        div.appendChild(div1);

        var span4 = document.createElement('span');
        span4.id = "buttonColorPrev";
        span4.onclick = function() {
            setBoardColor(_color - 1);
        }
        div.appendChild(span4);


        parent.appendChild(div);
    }

    addMenuItem("menuAnalysisMode", "Mode 1: Analyze Board", 1, _gameMode != 1, function(e) { menuAnalysisMode() });
    addMenuItem("menuPlayEngine", "Mode 2: Player (White) vs. Engine (Black)", 2, _gameMode != 2, function(e) { menuPlayEngineWhite() });
    addMenuItem("menuPlayEngine", "Mode 3: Engine (White) vs. Player (Black)", 3, _gameMode != 3, function(e) { menuPlayEngineBlack() });
    addMenuItem("menuTwoPlayerMode", "Mode 4: Player vs. Player", 4, _gameMode != 4, function(e) { menuTwoPlayerMode() });
    addMenuItem("menuTwoEngineMode", "Mode 5: Stock vs. Fish", 5, _gameMode != 5, function(e) { menuTwoEngineMode() });
    

    addMenuLine();

    addMenuItemEngine("menuEngine", _play != null ? "Engine level" : "Engine depth");

    addMenuLine();
    addMenuItem("menuKeep", "Keep changes", null, document.getElementById("buttonRevert").className == "on", function() {
        command("keep");
        showHideMenu(false);
    });
    addMenuItem("menuRevert", "Revert changes", "ESC", document.getElementById("buttonRevert").className == "on", function() {
        command("revert");
        showHideMenu(false);
    });
    addMenuLine();
    addMenuItem("menuFlip", "Flip board", "F", true, function() {
        command("flip");
        showHideMenu(false);
    });
    addMenuItem("menuStm", "Change side to move", "T", true, function() {
        command("sidetomove");
        showHideMenu(false);
    });
    addMenuItem("menuStm2", "Change side to move", "T2", true, function() {
        command("sidetomove2");
        showHideMenu(false);
    });
    addMenuLine();
    addMenuItem("menuStart", "Go to game start", "Home", document.getElementById("buttonBack").className == "on", function() {
        historyMove(-1, null, true);
        showHideMenu(false);
    });
    addMenuItem("menuEnd", "Go to game end", "End", document.getElementById("buttonForward").className == "on", function() {
        historyMove(+1, null, true);
        showHideMenu(false);
    });
    addMenuItem("menuReset", "Reset game/position", null, true, function() {
        command("reset");
        showHideMenu(false);
    });
    addMenuLine();
    addMenuItemColor("menuColor", "Chessboard color");
    addMenuItem("menuWindow", "Open in new window...", null, true, function() {
        command("window");
        showHideMenu(false);
    });
}

// Menu Functions

function menuAnalysisMode() {
    _gameMode = 1;
    _play = null;
    _engine.kill = false;
    showBoard(false);
    showHideMenu(false);
    historySave();
}

function menuPlayEngineWhite() {
    _gameMode = 2;
    _isPlayerWhite = true;
    _play = 0;
    showBoard(true);
    showHideMenu(false);
    doComputerMove();
    historySave();
}

function menuPlayEngineBlack() {
    _gameMode = 3;
    _isPlayerWhite = false;
    _play = 1;
    showBoard(true);
    showHideMenu(false);
    doComputerMove();
    historySave();
}

function menuTwoPlayerMode() {
    _gameMode = 4;
    _engine.kill = true;
    _play = null;
    showBoard(false);
    showHideMenu(false);
    historySave();
}

function menuTwoEngineMode() {
    _gameMode = 5;
}

function EngineWhite() {
    _play = 1;
    _isPlayerWhite = false;
    showBoard(true);
    showHideMenu(false);
    doComputerMove();
    historySave();
}

function EngineBlack() {
    _play = 0;
    _isPlayerWhite = true;
    showBoard(true);
    showHideMenu(false);
    doComputerMove();
    historySave();
}


// URL paramenters

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results || !results[2]) return "";
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

// Initialization

function setupBoxes() {
    var elems = [document.getElementById("colLeft"), document.getElementById("colRight")];
    for (var j = 0; j < elems.length; j++)
        for (var i = 0; i < elems[j].children.length; i++) {
            var div = elems[j].children[i];
            if (div.tagName != 'DIV') continue;
            if (div.className != "box") continue;
            if (!_mobile) {
                setupDragElement(div);
                var divCloseIcon = document.createElement('div');
                divCloseIcon.className = "closeIcon";
                divCloseIcon.onclick = function() {
                    var boxElem = this.parentElement;
                    showHideWindow(boxElem.id.substring(1));
                }
                div.appendChild(divCloseIcon);
            }
            if (!_mobile || div.id != "wChessboard") {
                var divBoxIcon = document.createElement('div');
                divBoxIcon.className = "boxIcon icon" + div.id.substring(1);
                div.appendChild(divBoxIcon);
            }
            var wbIcon = document.createElement('div');
            wbIcon.id = "wb" + div.id.substring(1);
            wbIcon.title = div.id.substring(1);
            wbIcon.className = "wbButton icon" + div.id.substring(1);
            if (div.style.display != "none") wbIcon.className += " selected";

            wbIcon.onclick = function() {
                showHideWindow(this.id.substring(2));
            }
            document.getElementById("wb").appendChild(wbIcon);
        }
}

function setupDragElement(elmnt) {
    var pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;
    oldDisplay = elmnt.style.display;
    elmnt.style.display = "";
    elmnt.originalWidth = elmnt.style.width = (elmnt.getBoundingClientRect().width - 2) + "px";
    elmnt.originalHeight = elmnt.style.height = (elmnt.getBoundingClientRect().height - 2) + "px";
    elmnt.style.display = oldDisplay;
    elmnt.firstElementChild.onmousedown = startBoxDrag;
    elmnt.firstElementChild.ondblclick = function() {
        elmnt.style.width = elmnt.originalWidth;
        elmnt.style.height = elmnt.originalHeight;
        elmnt.style.left = "";
        elmnt.style.top = "";
        elmnt.style.position = "";
        elmnt.style.zIndex = "4";
    };
    setupTouchEvents(elmnt.firstElementChild, startBoxDrag, moveBoxDrag, endBoxDrag);

    var resizeSquare = document.createElement('div');
    resizeSquare.style.position = "absolute";
    resizeSquare.style.bottom = resizeSquare.style.right = "0";
    resizeSquare.style.width = resizeSquare.style.height = "12px";
    resizeSquare.style.cursor = "nw-resize";
    resizeSquare.onmousedown = startBoxResize;
    resizeSquare.ondblclick = function() {
        elmnt.style.width = elmnt.originalWidth;
        elmnt.style.height = elmnt.originalHeight;
    };
    setupTouchEvents(resizeSquare, startBoxResize, moveBoxResize, endBoxDrag);
    elmnt.appendChild(resizeSquare);

    function startBoxDrag(e) {
        e = e || window.event;
        if (e && e.preventDefault) e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = endBoxDrag;
        document.onmousemove = moveBoxDrag;
    }

    function moveBoxDrag(e) {
        e = e || window.event;
        if (e && e.preventDefault) e.preventDefault();
        if (elmnt.style.position != "absolute") {
            elmnt.style.width = (elmnt.getBoundingClientRect().width - 2) + "px";
            elmnt.style.height = (elmnt.getBoundingClientRect().height - 2) + "px";
            elmnt.style.left = (elmnt.getBoundingClientRect().left - document.getElementById("container").getBoundingClientRect().left) + "px";
            elmnt.style.top = (elmnt.getBoundingClientRect().top - document.getElementById("container").getBoundingClientRect().top - 8) + "px";
            elmnt.style.position = "absolute";
        }

        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        var x0 = parseFloat(elmnt.style.left.replace("px", "")) || 0;
        var y0 = parseFloat(elmnt.style.top.replace("px", "")) || 0;
        elmnt.style.left = (x0 - pos1) + "px";
        elmnt.style.top = (y0 - pos2) + "px";
        elmnt.style.zIndex = "5";
        elmnt.style.cursor = "move";
    }

    function endBoxDrag() {
        document.onmouseup = onMouseUp;
        document.onmousemove = defaultMouseMove;
        elmnt.style.zIndex = "4";
        elmnt.style.cursor = "";
    }

    function startBoxResize(e) {
        e = e || window.event;
        if (e && e.preventDefault) e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.style.width = (elmnt.getBoundingClientRect().width - 2) + "px";
        elmnt.style.height = (elmnt.getBoundingClientRect().height - 2) + "px";
        document.onmouseup = endBoxDrag;
        document.onmousemove = moveBoxResize;
    }

    function moveBoxResize(e) {
        e = e || window.event;
        if (e && e.preventDefault) e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        var x0 = parseFloat(elmnt.style.width.replace("px", "")) || 0;
        var y0 = parseFloat(elmnt.style.height.replace("px", "")) || 0;
        elmnt.style.width = (x0 - pos1) + "px";
        elmnt.style.height = (y0 - pos2) + "px";
        elmnt.style.zIndex = "5";
        elmnt.style.cursor = "nw-resize";
    }
}

var _staticEvalListCache = [],
    _staticEvalListCacheSize = 20;

function getStaticEvalList(pos) {
    var posfen = generateFEN(pos);
    for (var si = 0; si < _staticEvalListCache.length; si++)
        if (_staticEvalListCache[si][0] == posfen) return _staticEvalListCache[si][1];

    var data = _staticEvalData;
    var grouplist = [],
        midindex = null,
        endindex = null,
        maincode = null;
    for (var i = 0; i < data.length; i++) {
        if (data[i].name == "Middle game evaluation") midindex = i;
        if (data[i].name == "End game evaluation") endindex = i;
        if (data[i].name == "Main evaluation") maincode = data[i].code;
    }
    if (midindex == null || endindex == null || maincode == null) return;
    var zero = function() {
        return 0;
    };
    for (var i = 0; i < data.length; i++) {
        var n = data[i].name.toLowerCase().replace(/ /g, "_");
        while (i != midindex && i != endindex && maincode.indexOf("$" + n + "(") >= 0) {
            try {
                maincode = maincode.replace("$" + n + "(", "(function(){return " + eval("$" + n + "(pos)") + ";})(");
            } catch (e) {
                alert(e.message);
                return [];
            }
        }
        if (data[midindex].code.indexOf("$" + n + "(") < 0 &&
            data[endindex].code.indexOf("$" + n + "(") < 0) continue;
        var code = data[i].code,
            list = [];
        for (var j = 0; j < data.length; j++) {
            if (!data[j].graph || data[j].group != data[i].group || i == j) continue;
            var n2 = data[j].name.toLowerCase().replace(/ /g, "_");
            code = code.replace("$" + n2 + "(", "$g-" + n2 + "(").replace("$" + n2 + "(", "$g-" + n2 + "(");
            list.push(n2);
        }
        if (data[i].graph) list.push(n);
        for (var j = 0; j < list.length; j++) {
            var n2 = list[j];
            if (code.indexOf("$g-" + n2 + "(") < 0 && !data[i].graph) continue;
            var mw = 0,
                mb = 0,
                ew = 0,
                eb = 0,
                func = null;
            try {
                eval("func = " + code.replace("$g-" + n2 + "(", "$" + n2 + "(")
                    .replace("$g-" + n2 + "(", "$" + n2 + "(")
                    .replace(/\$g\-[a-z_]+\(/g, "zero(") + ";");
                if (data[midindex].code.indexOf("$" + n + "(pos") >= 0) mw = func(pos);
                if (data[midindex].code.indexOf("$" + n + "(colorflip(pos)") >= 0) mb = func(colorflip(pos));
                if (data[endindex].code.indexOf("$" + n + "(pos") >= 0) ew = func(pos);
                if (data[endindex].code.indexOf("$" + n + "(colorflip(pos)") >= 0) eb = func(colorflip(pos));
            } catch (e) {
                alert(e.message);
                return [];
            }
            var evals = [mw - mb, ew - eb];
            var index = grouplist.map(function(e) {
                return e.elem;
            }).indexOf(n2);
            if (index < 0) {
                grouplist.push({
                    group: data[i].group,
                    elem: n2,
                    item: evals,
                    hidden: false,
                    mc: pos.m[1]
                });
            } else {
                grouplist[index].item[0] += evals[0];
                grouplist[index].item[1] += evals[1];
            }
        }

    }
    grouplist.sort(function(a, b) {
        return (a.group > b.group) ? 1 : ((b.group > a.group) ? -1 : 0);
    });
    maincode = maincode.replace("function $$(pos)", "function $$(PMG,PEG)")
        .replace("$middle_game_evaluation(pos)", "PMG")
        .replace("$end_game_evaluation(pos)", "PEG")
    var mainfunc = eval("(" + maincode + ")");
    for (var i = 0; i < grouplist.length; i++) {
        grouplist[i].item.push(mainfunc(grouplist[i].item[0], grouplist[i].item[1]) - mainfunc(0, 0));
    }
    grouplist.push({
        group: "Tempo",
        elem: "tempo",
        item: [mainfunc(0, 0), mainfunc(0, 0), mainfunc(0, 0)],
        hidden: false,
        mc: pos.m[1]
    });

    _staticEvalListCache.push([posfen, grouplist]);
    if (_staticEvalListCache.length > _staticEvalListCacheSize) _staticEvalListCache.shift();
    return grouplist;
}

function setupTouchEvents(elem, funcStart, funcMove, funcEnd) {
    var onTouch = function(e) {
        if (e.cancelable) e.preventDefault();
        if (e.touches.length > 1 || e.type == "touchend" && e.touches.length > 0) return;
        switch (e.type) {
            case "touchstart":
                funcStart(e.changedTouches[0]);
                break;
            case "touchmove":
                funcMove(e.changedTouches[0]);
                break;
            case "touchend":
                funcEnd(e.changedTouches[0]);
                break;
        }
    }
    elem.addEventListener("touchstart", onTouch, false);
    elem.addEventListener("touchend", onTouch, false);
    elem.addEventListener("touchcancel", onTouch, false);
    elem.addEventListener("touchmove", onTouch, false);
}


function lczeroEvaluate() {
    var index = _historyindex;
    if (_history[_historyindex][0] != getCurFEN()) index++;
    var fen = getCurFEN();
    var pos = parseFEN(fen);
    var input = [],
        ckey = "";
    for (var i = 0; i < 8; i++) {
        var pos2 = index < 0 ? null : parseFEN(index > _historyindex ? fen : _history[index][0]);
        if (pos2 != null && !pos.w) pos2 = colorflip(pos2);
        var s = "PNBRQKpnbrqk.";
        var rep = 0;
        var samepos = function(a1, a2) {
            var aa1 = a1.replace(/^\s+/, '').split(' ');
            var aa2 = a2.replace(/^\s+/, '').split(' ');
            if (aa1[0] != aa2[0]) return false;
            if (aa1[1] != aa2[1]) return false;
            if (aa1[2] != aa2[2]) return false;
            if (aa1[3] != aa2[3]) return false;
            return true;
        }
        if (index >= 0) {
            var a1 = index > _historyindex ? fen : _history[index][0];
            for (var j = index - 2; j >= 0; j -= 2) {
                var a2 = _history[j][0];
                if (samepos(a1, a2)) rep = 1;
            }
        }
        for (var j = 0; j < s.length; j++) {
            for (var y = 0; y < 8; y++)
                for (var x = 0; x < 8; x++) {
                    if (pos2 == null) input.push(0);
                    else input.push(j == s.length - 1 ? rep : (board(pos2, x, 7 - y) == s[j]) ? 1 : 0);
                }
        }
        ckey += index < 0 ? "" : rep + ":" + (index > _historyindex ? fen : _history[index][0]) + ",";
        index--;
    }
    v = [];
    v.push(pos == null ? 0 : pos.c[pos.w ? 1 : 3] ? 1 : 0);
    v.push(pos == null ? 0 : pos.c[pos.w ? 0 : 2] ? 1 : 0);
    v.push(pos == null ? 0 : pos.c[pos.w ? 3 : 1] ? 1 : 0);
    v.push(pos == null ? 0 : pos.c[pos.w ? 2 : 0] ? 1 : 0);
    v.push(pos == null ? 0 : pos.w ? 0 : 1);
    v.push(pos == null ? 0 : pos.m[1] - 1);
    v.push(0);
    v.push(1);
    for (var j = 0; j < v.length; j++)
        for (var y = 0; y < 8; y++)
            for (var x = 0; x < 8; x++) input.push(v[j]);

    if (_nncache == null) _nncache = new Map();
    var output;
    if (_nncache.has(ckey)) {
        output = _nncache.get(ckey, output);
    } else {
        output = lczero_forward(input);
        if (output == null) return null;
        _nncache.set(ckey, output);
    }

    var winrate = Math.tanh(output[1]);
    var policy = [];
    var alpha = Math.max.apply(Math, output[0]);
    var denom = 0;
    for (var j = 0; j < output[0].length; j++) {
        var val = Math.exp(output[0][j] - alpha);
        policy.push(val);
        denom += val;
    }
    for (var j = 0; j < policy.length; j++) policy[j] /= denom;

    var moves = genMoves(pos);
    var ismove = function(x1, y1, x2, y2) {
        if (x1 == x2 && y1 == y2) return false;
        if (x1 == x2) return true;
        if (y1 == y2) return true;
        if (Math.abs(x1 - x2) == Math.abs(y1 - y2)) return true;
        if (Math.abs(x1 - x2) == 2 && Math.abs(y1 - y2) == 1) return true;
        if (Math.abs(x1 - x2) == 1 && Math.abs(y1 - y2) == 2) return true;
        return false;
    }
    var x1 = 0,
        y1 = 0,
        x2 = 0,
        y2 = 0,
        pp = 'B',
        px1 = 0,
        pxd = -1;
    for (var j = 0; j < output[0].length; j++) {
        var first = true;
        while (x1 < 8 && y1 < 8 && x2 < 8 && y2 < 8 && (!ismove(x1, y1, x2, y2) || first)) {
            first = false;
            x2++;
            if (x2 == 8) {
                x2 = 0;
                y2++;
            }
            if (y2 == 8) {
                y2 = 0;
                x1++;
            }
            if (x1 == 8) {
                x1 = 0;
                y1++;
            }
            if (y1 == 8) break;
        }
        if (y1 == 8) {
            if (pp == 'Q') pp = 'R';
            else if (pp == 'R') pp = 'B';
            else if (pp == 'B') {
                pp = 'Q';
                pxd++;
                if (pxd > 1) {
                    pxd = -1;
                    px1++;
                }
            }
        }
        for (var i = 0; i < moves.length; i++) {
            var move = moves[i];
            var castling = (board(pos, move.from.x, move.from.y).toUpperCase() == 'K' && Math.abs(move.from.x - move.to.x) > 1);
            if (!castling &&
                ((move.from.x == x1 && move.from.y == (pos.w ? 7 - y1 : y1) && move.to.x == x2 && move.to.y == (pos.w ? 7 - y2 : y2) && (move.p == null || move.p == 'N')) ||
                    (y1 == 8 && move.p == pp && move.from.x == px1 && move.to.x == px1 + pxd && move.from.y == (pos.w ? 1 : 6) && move.to.y == (pos.w ? 0 : 7))) ||
                castling &&
                (move.from.x == x1 && move.from.y == (pos.w ? 7 - y1 : y1) && (move.to.x > 3 ? 7 : 0) == x2 && move.to.y == (pos.w ? 7 - y2 : y2))
            ) {
                move.policy = policy[j];
            }
        }
    }
    return [moves, pos.w ? winrate : -winrate];
}

window.onload = function() {
    document.onmousedown = onMouseDown;
    document.onmouseup = onMouseUp;
    document.onmousemove = defaultMouseMove;
    document.onkeydown = onKeyDown;
    document.getElementById("chessboard1").oncontextmenu =
        document.getElementById("chessboard1").parentNode.oncontextmenu =
        document.getElementById("editWrapper").oncontextmenu = function() {
            return false;
        };
    document.getElementById("chessboard1").parentNode.onwheel =
        document.getElementById("editWrapper").onwheel = onWheel;
    document.getElementById("buttonStm").onclick = function() {
        command("sidetomove");
    };
    document.getElementById("buttonStm2").onclick = function() {
        command("sidetomove2");
        btneng = document.getElementById('buttonStm2').className = _isPlayerWhite ? "blue" : "red";
        if (btneng=="blue"){
            EngineBlack()
            bteng="red"
        } else {
            EngineWhite()
            bteng="blue"
        }
    };
    document.getElementById("buttonFlip").onclick = function() {
        doFlip();
    };
    document.getElementById("buttonBack").onclick = function(event) {
        historyMove(-1, event);
    };
    document.getElementById("buttonForward").onclick = function(event) {
        historyMove(+1, event);
    };
    document.getElementById("buttonMenu").onclick = function(event) {
        showHideMenu(true, event);
    };
    document.getElementById("buttonStaticSortByValue").onclick = function(event) {
        _staticSortByChange = false;
        repaintStatic();
    };
    document.getElementById("buttonStaticSortByChange").onclick = function(event) {
        _staticSortByChange = true;
        repaintStatic();
    };
    document.getElementById("buttonMovesPv").onclick = function(event) {
        _movesPv = !_movesPv;
        showEvals();
    };
    document.getElementById("graphWrapper").onmouseover = function() {
        if (document.onmousemove == defaultMouseMove) document.onmousemove = graphMouseMove;
    };
    document.getElementById("graphWrapper").onmousedown = function(event) {
        if (document.onmousemove == defaultMouseMove) {
            document.onmousemove = graphMouseMove;
            graphMouseMove(event);
            graphMouseDown(event);
        }
    };
    document.getElementById("graphWrapper").onmouseout = function() {
        if (document.onmousemove == graphMouseMove) document.onmousemove = defaultMouseMove;
        repaintGraph();
        updateTooltip("");
    };
    document.getElementById("graphWrapper").onwheel = function(event) {
        onWheel(event);
        showGraphTooltip(_historyindex, event);
    };

    document.getElementById("arrowWrapper1").style.top = document.getElementById("arrowWrapper2").style.top = document.getElementById("arrowWrapper3").style.top = document.getElementById('chessboard1').getBoundingClientRect().top - document.getElementById("boardWrapper").getBoundingClientRect().top + "px";
    document.getElementById("arrowWrapper1").style.left = document.getElementById("arrowWrapper2").style.left = document.getElementById("arrowWrapper3").style.left = document.getElementById('chessboard1').getBoundingClientRect().left - document.getElementById("boardWrapper").getBoundingClientRect().left + "px";
    document.getElementById("arrowWrapper1").style.width = document.getElementById("arrowWrapper2").style.width = document.getElementById("arrowWrapper3").style.width = document.getElementById("arrowWrapper1").style.height = document.getElementById("arrowWrapper2").style.height = document.getElementById("arrowWrapper3").style.height = (40 * 8) + "px";

    if (_mobile) setupMobileLayout(true);
    setupTouchEvents(document.getElementById("chessboard1"), onMouseDown, onMouseMove, onMouseUp);
    setupTouchEvents(document.getElementById("editWrapper"), onMouseDown, onMouseMove, onMouseUp);
    checkSizes();
    window.setInterval(checkSizes, 500);
    setupBoxes();
    setupInput();
    _engine = loadEngine();
    showBoard();
    for (var i = 0; i < 26; i++) command(getParameterByName(String.fromCharCode("a".charCodeAt(0) + i)));
}

function flipforPlayer(){
    doFlip();
}