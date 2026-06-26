#!/usr/bin/env python3
"""
validate_schools.py — Pre-commit data integrity checker.
Run from the repo root: python validate_schools.py
Exits with code 1 if any errors are found.
"""

import json
import sys
from pathlib import Path

CONF_FILES = ['acc', 'big-ten', 'big-east', 'aac', 'big-west', 'caa', 'other']
VALID_DIVS = {'D1', 'IVY', 'D2', 'NAIA', 'D3', 'JUCO'}
VALID_DEPTHS = {'full', 'listed'}
VALID_LENS_KEYS = {'overall', 'soccer', 'academic', 'minutes', 'lifestyle', 'value'}
VALID_DEV_KEYS = {'tactical', 'technical', 'fitness'}
VALID_FACILITY_RATINGS = {'Elite', 'Excellent', 'Very Good', 'Good', 'Solid'}
REQUIRED_ACU_UNITS = [
    'ANAT100','EXSC222','BIOL125','EXSC225','EXSC322','EXSC394',
    'EXSC224','EXSC321','EXSC204','EXSC216','EXSC199','EXSC296',
    'EXSC187','EXSC230','EXSC122','EXSC398',
]
FULL_REQUIRED_FIELDS = [
    'id','name','full','loc','div','conf','confKey',
    'degreeTitle','acuAlign','acuAlignNote','soccerLevel',
    'cost','aid','fin','coach','gpa','devScores','fitOlivier',
    'lensScores','minutesOutlook','profileDepth','mapX','mapY',
    'facilityDetails','culture','acuUnits',
]
# domain is required for favicon — warn if missing (JUCO/D3 may not have athletics domains)
WARN_MISSING_FIELDS = ['domain']

errors = []
warnings = []
seen_ids = {}

def err(school_id, msg):
    errors.append(f'  ERROR [{school_id}] {msg}')

def warn(school_id, msg):
    warnings.append(f'  WARN  [{school_id}] {msg}')


def validate_school(s, filename):
    sid = s.get('id', '???')

    # Duplicate ID check
    if sid in seen_ids:
        err(sid, f'Duplicate ID — also in {seen_ids[sid]}')
    else:
        seen_ids[sid] = filename

    depth = s.get('profileDepth')
    if depth not in VALID_DEPTHS:
        err(sid, f'profileDepth="{depth}" — must be "full" or "listed"')
        return  # can't validate further without knowing depth

    # Division
    if s.get('div') not in VALID_DIVS:
        err(sid, f'div="{s.get("div")}" — must be one of {VALID_DIVS}')

    # fitOlivier range
    fit = s.get('fitOlivier')
    if fit is not None:
        if not isinstance(fit, (int, float)) or not (0 <= fit <= 100):
            err(sid, f'fitOlivier={fit} — must be 0–100')

    # acuAlign range and acuUnits consistency
    acu_align = s.get('acuAlign')
    acu_units = s.get('acuUnits', [])
    if acu_align is not None:
        if not isinstance(acu_align, int) or not (0 <= acu_align <= 16):
            err(sid, f'acuAlign={acu_align} — must be integer 0–16')
    if acu_units:
        if len(acu_units) != 16:
            err(sid, f'acuUnits has {len(acu_units)} entries — must be exactly 16')
        else:
            # Check unit codes in order
            actual_codes = [u.get('unit') for u in acu_units]
            if actual_codes != REQUIRED_ACU_UNITS:
                err(sid, f'acuUnits unit codes are out of order or wrong')
            # Verify covered count matches acuAlign
            covered_count = sum(1 for u in acu_units if u.get('covered') is True)
            if acu_align is not None and covered_count != acu_align:
                err(sid, f'acuAlign={acu_align} but {covered_count} units have covered:true — mismatch')

    if depth == 'full':
        # Required fields
        for field in FULL_REQUIRED_FIELDS:
            if field not in s:
                err(sid, f'Missing required field: {field}')
        for field in WARN_MISSING_FIELDS:
            if not s.get(field):
                warn(sid, f'Missing optional field: {field} (favicon will not load)')

        # lensScores keys
        ls = s.get('lensScores', {})
        if isinstance(ls, dict):
            missing_lens = VALID_LENS_KEYS - set(ls.keys())
            extra_lens = set(ls.keys()) - VALID_LENS_KEYS
            if missing_lens:
                err(sid, f'lensScores missing keys: {missing_lens}')
            if extra_lens:
                warn(sid, f'lensScores has unexpected keys: {extra_lens}')
            for k, v in ls.items():
                if not isinstance(v, (int, float)) or not (0 <= v <= 100):
                    err(sid, f'lensScores.{k}={v} — must be 0–100')

        # devScores keys (null is valid for listed, must be dict for full)
        ds = s.get('devScores')
        if ds is None:
            err(sid, 'devScores is null — must be dict with tactical/technical/fitness for full-profile')
        elif isinstance(ds, dict):
            missing_dev = VALID_DEV_KEYS - set(ds.keys())
            extra_dev = set(ds.keys()) - VALID_DEV_KEYS
            if missing_dev:
                err(sid, f'devScores missing keys: {missing_dev}')
            if extra_dev:
                err(sid, f'devScores has extra keys: {extra_dev} — ptPath was removed in v22')
            for k, v in ds.items():
                if not isinstance(v, (int, float)) or not (0 <= v <= 100):
                    err(sid, f'devScores.{k}={v} — must be 0–100')

        # facilityDetails.rating
        fd = s.get('facilityDetails', {})
        if isinstance(fd, dict):
            rating = fd.get('rating')
            if rating not in VALID_FACILITY_RATINGS:
                err(sid, f'facilityDetails.rating="{rating}" — must be one of {VALID_FACILITY_RATINGS}')

        # minutesOutlook must have available key
        mo = s.get('minutesOutlook', {})
        if not isinstance(mo, dict) or 'available' not in mo:
            err(sid, 'minutesOutlook missing "available" key')
        elif mo.get('available') is True:
            traj = mo.get('trajectory', [])
            if not traj:
                err(sid, 'minutesOutlook.available=true but trajectory is empty')

        # mapX / mapY sanity
        mx, my = s.get('mapX'), s.get('mapY')
        if mx is not None and not (0 <= mx <= 640):
            warn(sid, f'mapX={mx} is outside 0–640 SVG bounds')
        if my is not None and not (0 <= my <= 390):
            warn(sid, f'mapY={my} is outside 0–390 SVG bounds')

        # fin.costNum sanity
        fin = s.get('fin', {})
        if isinstance(fin, dict):
            cn = fin.get('costNum')
            if cn is not None and not isinstance(cn, (int, float)):
                err(sid, f'fin.costNum="{cn}" — must be a number')
            elif cn is not None and not (0 <= cn <= 150000):
                warn(sid, f'fin.costNum={cn} is outside typical range 0–150000')

    elif depth == 'listed':
        # devScores must be null for listed profiles
        ds = s.get('devScores')
        if ds is not None:
            err(sid, f'devScores must be null for listed-profile — got {type(ds).__name__}')


def validate_coaches():
    path = Path('data/coaches.json')
    if not path.exists():
        errors.append('  ERROR coaches.json not found')
        return
    coaches = json.loads(path.read_text(encoding='utf-8'))
    seen_ranks = {}
    school_ids = set(seen_ids.keys())

    for c in coaches:
        cid = c.get('id', '???')
        # schoolId must match a known school
        sid = c.get('schoolId')
        if sid and school_ids and sid not in school_ids:
            warn(cid, f'coaches.json schoolId="{sid}" not found in any conference file')
        # rank must be unique
        rank = c.get('rank')
        if rank in seen_ranks:
            errors.append(f'  ERROR [coach:{cid}] rank={rank} duplicated (also coach:{seen_ranks[rank]})')
        else:
            seen_ranks[rank] = cid
        # rankClass must use hyphens
        rc = c.get('rankClass', '')
        if '_' in rc:
            errors.append(f'  ERROR [coach:{cid}] rankClass="{rc}" uses underscores — must use hyphens (rk-elite, rk-strong, rk-solid)')
        # overallScore range
        score = c.get('overallScore')
        if score is not None and not (0 <= score <= 100):
            errors.append(f'  ERROR [coach:{cid}] overallScore={score} — must be 0–100')


def main():
    print('=== validate_schools.py ===\n')

    # Validate each conference file
    for conf in CONF_FILES:
        path = Path(f'data/{conf}.json')
        if not path.exists():
            errors.append(f'  ERROR {conf}.json not found')
            continue
        try:
            schools = json.loads(path.read_text(encoding='utf-8'))
        except json.JSONDecodeError as e:
            errors.append(f'  ERROR {conf}.json is invalid JSON: {e}')
            continue
        print(f'Checking {conf}.json ({len(schools)} schools)...')
        for school in schools:
            validate_school(school, conf + '.json')

    # Validate coaches.json
    print('\nChecking coaches.json...')
    validate_coaches()

    # Report
    print()
    if warnings:
        print(f'WARNINGS ({len(warnings)}):')
        for w in warnings:
            print(w)
        print()
    if errors:
        print(f'ERRORS ({len(errors)}):')
        for e in errors:
            print(e)
        print(f'\nFAIL — {len(errors)} error(s), {len(warnings)} warning(s)')
        sys.exit(1)
    else:
        msg = f'PASS — All schools valid — {len(seen_ids)} schools checked'
        if warnings:
            msg += f', {len(warnings)} warning(s)'
        print(msg)
        sys.exit(0)


if __name__ == '__main__':
    main()
