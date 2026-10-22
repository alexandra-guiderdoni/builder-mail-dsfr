"""Dérive le rendu CSS du catalogue épinglé, sans modifier son contrat canonique."""

import html
import re
from html.parser import HTMLParser

LAYOUT_CSS = """
@media(max-width:600px){
 table.mail-columns-stack{table-layout:auto}
 table.mail-columns-stack>tbody,table.mail-columns-stack>tbody>tr,
 table.mail-columns-stack>tbody>tr>td{display:block!important}
 table.mail-columns-stack>tbody>tr>td{width:auto!important;min-width:0!important}
 table.mail-columns-stack>tbody>tr>td[data-mail-side=right]{direction:rtl}
 table.mail-columns-stack>tbody>tr>td>table{direction:ltr}
 table.mail-columns-stack>tbody>tr>td[data-mail-gap]{display:none!important}
}
@media(min-width:481px) and (max-width:600px){
 table.mail-columns-wide{min-width:480px}
}
@media(600px < width < 620px){
 table.wlkm-mw{width:100%!important}
}
"""

# Largeurs qualifiées dans la référence épinglée : une dérive arrête la compilation.
COLUMNS = {
    2: [76, 130],
    3: [76, 70, 130],
    6: [331, 160],
    30: [135, 340],
    31: [135, 340],
    32: [340, 140],
    33: [340, 140],
    46: [236, 236],
    47: [76, 130],
    48: [76, 70, 130],
}
FORBIDDEN = {
    "align",
    "alink",
    "background",
    "bgcolor",
    "border",
    "cellpadding",
    "cellspacing",
    "char",
    "charoff",
    "clear",
    "color",
    "compact",
    "frameborder",
    "hspace",
    "link",
    "marginheight",
    "marginwidth",
    "text",
    "valign",
    "vlink",
    "vspace",
    "size",
    "width",
    "height",
}
VOID = {
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
}


class Element:
    def __init__(self, tag, attrs=(), children=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), list(children)
        self.parent = None
        for child in self.children:
            if isinstance(child, Element):
                child.parent = self

    def elements(self):
        for child in self.children:
            if isinstance(child, Element):
                yield child
                yield from child.elements()

    def table(self):
        node = self.parent
        while node and node.tag != "table":
            node = node.parent
        return node

    def style(self, css, prepend=False):
        # Ne pas passer par un moteur CSS : il retirerait les propriétés mso-*.
        current = self.attrs.get("style", "")
        self.attrs["style"] = css + ";" + current if prepend else current + ";" + css

    def source(self):
        attributes = "".join(
            " "
            + key
            + ('="' + html.escape(value, quote=True) + '"' if value is not None else "")
            for key, value in self.attrs.items()
        )
        start = "<" + self.tag + attributes + ">" if self.tag else ""
        content = "".join(
            c.source() if isinstance(c, Element) else c for c in self.children
        )
        return (
            start
            + content
            + ("</" + self.tag + ">" if self.tag and self.tag not in VOID else "")
        )


class Fragment(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.root = Element("")
        self.stack = [self.root]
        self.feed(source)
        self.close()
        if len(self.stack) != 1:
            raise ValueError("Gabarit mail non fermé.")

    def handle_starttag(self, tag, attrs):
        node = Element(tag, attrs)
        node.parent = self.stack[-1]
        node.parent.children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if self.stack[-1].tag != tag:
            raise ValueError(f"Fermeture inattendue dans le gabarit mail : {tag}.")
        self.stack.pop()

    def handle_data(self, data):
        self.stack[-1].children.append(data)

    def handle_entityref(self, name):
        self.handle_data("&" + name + ";")

    def handle_charref(self, name):
        self.handle_data("&#" + name + ";")

    def handle_comment(self, data):
        self.handle_data("<!--" + data + "-->")


def native_columns(root, index):
    groups = []
    for parent in [root, *root.elements()]:
        tables = [
            c
            for c in parent.children
            if isinstance(c, Element)
            and c.tag == "table"
            and c.attrs.get("align") in ["left", "right"]
        ]
        if len(tables) < 2:
            continue
        basis = parent.table().attrs.get("width", "") if parent.table() else ""
        if basis != "496":
            raise ValueError(f"Base de colonnes inattendue dans mail-{index:02}.")
        widths = [
            max(
                int(t.attrs.get("width", 0)),
                *(int(e.attrs.get("width", 0)) for e in t.elements() if e.tag == "img"),
                0,
            )
            for t in tables
        ]
        sides = [t.attrs["align"] for t in tables]
        expected_sides = (
            ["left", "left", "right"] if index in [3, 48] else ["left", "right"]
        )
        if widths != COLUMNS.get(index) or sides != expected_sides or groups:
            raise ValueError(f"Colonnes non qualifiées dans mail-{index:02}.")
        groups.append(widths)
        row = Element("tr")
        wrapper = Element(
            "table",
            {
                "role": "presentation",
                "data-mail-columns": "",
                "data-mail-basis": basis,
                "style": "width:100%;table-layout:fixed;border-collapse:collapse;"
                "border-spacing:0;padding:0;margin:0;"
                "mso-table-lspace:0pt;mso-table-rspace:0pt",
            },
            [Element("tbody", children=[row])],
        )
        if index not in [2, 3, 47, 48]:
            wrapper.attrs["class"] = "mail-columns-stack" + (
                " mail-columns-wide" if index in [30, 31] else ""
            )
        wrapper.parent = parent
        parent.children.insert(parent.children.index(tables[0]), wrapper)
        for table, width in zip(tables, widths):
            side = table.attrs.pop("align")
            if side == "right":
                gap = Element("td", {"data-mail-gap": "", "style": "padding:0"})
                gap.parent = row
                row.children.append(gap)
            if index in [3, 48] and side == "right":
                table.attrs["style"], count = re.subn(
                    r"width\s*:\s*calc\(100%\s*-\s*180px\)\s*(?=;|$)",
                    "width:100%",
                    table.attrs.get("style", ""),
                )
                if count != 1:
                    raise ValueError(f"Signature non qualifiée dans mail-{index:02}.")
            table.style(
                "margin-left:0;margin-right:auto"
                if side == "left"
                else "margin-left:auto;margin-right:0"
            )
            cell = Element(
                "td",
                {
                    "data-mail-column": "",
                    "data-mail-side": side,
                    "style": f"width:{width}px;padding:0;vertical-align:top",
                },
                [table],
            )
            cell.parent = row
            row.children.append(cell)
            parent.children.remove(table)
    if bool(groups) != (index in COLUMNS):
        raise ValueError(f"Groupe de colonnes absent dans mail-{index:02}.")
    for table in root.elements():
        if table.tag == "table" and table.attrs.get("align") in ["left", "right"]:
            side = table.attrs.pop("align")
            table.style(
                "margin-left:0;margin-right:auto"
                if side == "left"
                else "margin-left:auto;margin-right:0"
            )


def css_template(index, source):
    root = Fragment(source).root
    native_columns(root, index)
    for node in root.elements():
        defaults = (
            ["text-align:left", "text-align:start"] if node.tag == "table" else []
        )
        if node.tag == "td":
            defaults += ["overflow-wrap:anywhere", "word-break:break-word"]
        if node.tag == "td" and node.attrs.get("align") == "center":
            for child in node.children:
                if isinstance(child, Element) and (
                    child.tag == "table"
                    or (
                        child.tag == "img"
                        and re.search(
                            r"display\s*:\s*block",
                            child.attrs.get("style", ""),
                            re.IGNORECASE,
                        )
                    )
                ):
                    child.style("margin-left:auto;margin-right:auto", prepend=True)
        if "cellpadding" in node.attrs:
            if node.attrs["cellpadding"] != "0":
                raise ValueError("Espacement de cellules mail non qualifié.")
            for cell in node.elements():
                if cell.tag in ["td", "th"] and cell.table() is node:
                    cell.style("padding:0px", prepend=True)
        for key, value in list(node.attrs.items()):
            if (
                key not in FORBIDDEN
                or (key == "size" and node.tag == "select")
                or (
                    key in ["width", "height"]
                    and node.tag in ["img", "object", "embed", "canvas", "svg"]
                )
            ):
                continue
            dimension = value + "px" if re.fullmatch(r"\d+", value or "") else value
            if key in ["width", "height"]:
                defaults.append(key + ":" + dimension)
            elif key in ["bgcolor", "valign", "cellspacing"]:
                defaults.append(
                    {
                        "bgcolor": "background-color:",
                        "valign": "vertical-align:",
                        "cellspacing": "border-spacing:",
                    }[key]
                    + (dimension if key == "cellspacing" else value)
                )
            elif key == "align" and node.tag == "table" and value == "center":
                defaults += ["margin-left:auto", "margin-right:auto"]
            elif key == "align" and node.tag != "table":
                defaults.append("text-align:" + value)
            elif key == "border" and value == "0":
                defaults.append("border:0")
            elif key != "cellpadding":
                raise ValueError(f"Attribut mail non qualifié : {node.tag}[{key}].")
            del node.attrs[key]
        if defaults:
            node.style(";".join(defaults), prepend=True)
    return root.source()
