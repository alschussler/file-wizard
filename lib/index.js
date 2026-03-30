#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const CURRENT_DIR = process.cwd();
const FILE_WIZARD_LOCK_FILE = '.file-wizard.lock';
const FILE_WIZARD_EDIT_FILE = '.file-wizard';
function getAllFilesPaths(targetDir) {
    const allFilesPaths = [];
    const files = fs.readdirSync(targetDir);
    for (const file of files) {
        const filePath = `${targetDir}/${file}`;
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            allFilesPaths.push(...getAllFilesPaths(filePath));
        }
        else {
            allFilesPaths.push(filePath);
        }
    }
    return allFilesPaths;
}
function getRelativePaths(paths) {
    return paths.map(filePath => path.relative(CURRENT_DIR, filePath));
}
function createEnumeratedList(paths) {
    return paths.map((path, index) => `${index + 1}: ${path}`).join('\n');
}
function hasWizardFile(lock = false) {
    return fs.existsSync(lock ? FILE_WIZARD_LOCK_FILE : FILE_WIZARD_EDIT_FILE);
}
function writeWizardFile(content, lock = false) {
    const filePath = lock ? FILE_WIZARD_LOCK_FILE : FILE_WIZARD_EDIT_FILE;
    fs.writeFileSync(filePath, content);
}
function readWizardFile(lock = false) {
    const filePath = lock ? FILE_WIZARD_LOCK_FILE : FILE_WIZARD_EDIT_FILE;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const map = new Map();
    for (const line of lines) {
        const [key, value] = line.split(':');
        if (key === '' || value === '') {
            console.warn(`[FileWizard]: Malformed line "${line}"`);
            continue;
        }
        map.set(key.trim(), value.trim());
    }
    return map;
}
function ensureDirectoryExists(filePath) {
    fs.mkdirSync(filePath, { recursive: true });
}
function renameFile(filePath, newFilePath) {
    ensureDirectoryExists(path.dirname(newFilePath));
    fs.renameSync(filePath, newFilePath);
}
function deleteFile(filePath) {
    fs.rmSync(filePath);
}
function createFile(filePath) {
    ensureDirectoryExists(path.dirname(filePath));
    fs.writeFileSync(filePath, '');
}
class FileWizard {
    #operation = 'list';
    constructor() {
        const hasEditFile = hasWizardFile();
        const hasLockFile = hasWizardFile(true);
        if (hasEditFile != hasLockFile) {
            throw new Error(`[FileWizard] Wizard file is corrupted. Edit or lock file is missing.`);
        }
        this.#operation = hasEditFile && hasLockFile ? 'apply' : 'list';
    }
    #list() {
        const paths = getAllFilesPaths(CURRENT_DIR);
        const relativePaths = getRelativePaths(paths);
        const enumeratedList = createEnumeratedList(relativePaths);
        writeWizardFile(enumeratedList);
        writeWizardFile(enumeratedList, true);
    }
    #apply() {
        const wizardEdit = readWizardFile();
        const wizardLock = readWizardFile(true);
        for (const [key, value] of wizardLock.entries()) {
            const editPath = wizardEdit.get(key);
            if (editPath === value) {
                continue;
            }
            if (!editPath) {
                deleteFile(value);
                continue;
            }
            renameFile(value, editPath);
        }
        const newFiles = wizardEdit
            .entries()
            .filter(([key]) => !wizardLock.has(key))
            .map(([_, value]) => value);
        for (const newFile of newFiles) {
            createFile(newFile);
        }
    }
    run() {
        if (this.#operation === 'list') {
            this.#list();
            console.log(`[FileWizard]: File ${FILE_WIZARD_EDIT_FILE} created, make the changes you want to apply.`);
            return;
        }
        if (this.#operation === 'apply') {
            this.#apply();
            deleteFile(FILE_WIZARD_EDIT_FILE);
            deleteFile(FILE_WIZARD_LOCK_FILE);
            console.log('[FileWizard]: Wizardry completed successfully.');
        }
    }
}
const wizard = new FileWizard();
wizard.run();
