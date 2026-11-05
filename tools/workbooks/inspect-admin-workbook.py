"""Read XLSX source XML without recalculating Google Sheets formula exports."""
import collections
import json
import posixpath
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

sys.stdout.reconfigure(encoding="utf-8")
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
RID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"

with zipfile.ZipFile(sys.argv[1]) as archive:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    paths = {item.get("Id"): posixpath.normpath(posixpath.join("xl", item.get("Target"))) for item in relationships}
    strings = []
    if "xl/sharedStrings.xml" in archive.namelist():
        strings = ["".join(item.itertext()) for item in ET.fromstring(archive.read("xl/sharedStrings.xml"))]

    def value(cell):
        raw = cell.findtext("s:v", "", NS)
        if cell.get("t") == "s":
            return strings[int(raw)] if raw else ""
        if cell.get("t") == "inlineStr":
            return "".join(cell.find("s:is", NS).itertext())
        return raw

    for sheet in workbook.find("s:sheets", NS):
        path = paths[sheet.get(RID)].lstrip("/")
        xml = ET.fromstring(archive.read(path))
        rows = xml.findall("s:sheetData/s:row", NS)
        headers = []
        formulas = collections.defaultdict(list)
        data_rows = 0
        for row in rows:
            has_input = False
            for cell in row:
                address = cell.get("r", "")
                col = re.sub(r"\d", "", address)
                formula = cell.find("s:f", NS)
                if row.get("r") == "1":
                    headers.append({"column": col, "label": value(cell)})
                elif formula is not None:
                    formulas[col].append((address, formula.text or "", formula.attrib))
                elif value(cell) and cell.get("t") != "e":
                    has_input = True
            data_rows += int(has_input)
        result = {
            "sheet": sheet.get("name"), "state": sheet.get("state"),
            "dimension": xml.find("s:dimension", NS).get("ref") if xml.find("s:dimension", NS) is not None else "not exported",
            "rows_with_literal_values": data_rows,
            "headers": headers,
            "formulas": {col: {"count": len(items), "first": items[0], "last_address": items[-1][0]} for col, items in formulas.items()},
            "validations": [item.attrib | {"formula1": item.findtext("s:formula1", "", NS)} for item in xml.findall("s:dataValidations/s:dataValidation", NS)],
        }
        if len(sys.argv) == 2 or sheet.get("name") in sys.argv[2:]:
            print(json.dumps(result, ensure_ascii=False))
