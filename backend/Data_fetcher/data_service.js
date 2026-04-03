const db = require('../db');

async function getSchools() {
    try {
        const [rows] = await db.query('SELECT * FROM schools ORDER BY name');
        for (const school of rows) {
            const [depts] = await db.query('SELECT * FROM courses WHERE school_id = ? ORDER BY name', [school.id]);
            school.departments = depts;
            for (const dept of depts) {
                const [units] = await db.query('SELECT * FROM units WHERE dept_id = ? ORDER BY name', [dept.id]);
                dept.units = units;
                for (const unit of units) {
                    const [notes] = await db.query('SELECT * FROM notes WHERE unit_id = ? ORDER BY created_at DESC', [unit.id]);
                    unit.notes = notes;
                }
            }
        }
        return rows;
    } catch (error) {
        console.error('Error fetching schools:', error);
        return [];
    }
}

async function getSchoolById(schoolId) {
    try {
        const [rows] = await db.query('SELECT * FROM schools WHERE id = ?', [parseInt(schoolId)]);
        return rows[0] || null;
    } catch (error) {
        console.error('Error fetching school:', error);
        return null;
    }
}

async function getDepartmentsBySchool(schoolId) {
    try {
        const [rows] = await db.query('SELECT * FROM courses WHERE school_id = ? ORDER BY name', [parseInt(schoolId)]);
        return rows;
    } catch (error) {
        console.error('Error fetching departments:', error);
        return [];
    }
}

async function getDepartmentById(schoolId, deptId) {
    try {
        const [rows] = await db.query('SELECT * FROM courses WHERE id = ? AND school_id = ?', [parseInt(deptId), parseInt(schoolId)]);
        return rows[0] || null;
    } catch (error) {
        console.error('Error fetching department:', error);
        return null;
    }
}

async function getUnitsByDepartment(schoolId, deptId) {
    try {
        const [rows] = await db.query('SELECT * FROM units WHERE dept_id = ? ORDER BY name', [parseInt(deptId)]);
        return rows;
    } catch (error) {
        console.error('Error fetching units:', error);
        return [];
    }
}

async function getUnitById(schoolId, deptId, unitId) {
    try {
        const [rows] = await db.query('SELECT * FROM units WHERE id = ? AND dept_id = ?', [parseInt(unitId), parseInt(deptId)]);
        return rows[0] || null;
    } catch (error) {
        console.error('Error fetching unit:', error);
        return null;
    }
}

async function getNotesByUnit(schoolId, deptId, unitId) {
    try {
        const [rows] = await db.query(`
            SELECT n.*, s.name as schoolName, c.name as courseName, u.name as unitName,
                   u.code as unitCode,
                   p.name as uploadedByName
            FROM notes n
            LEFT JOIN schools s ON n.school_id = s.id
            LEFT JOIN courses c ON n.dept_id = c.id
            LEFT JOIN units u ON n.unit_id = u.id
            LEFT JOIN notify_users p ON n.user_id = p.id
            WHERE n.unit_id = ? 
            ORDER BY n.created_at DESC`, [parseInt(unitId)]);
        return rows;
    } catch (error) {
        console.error('Error fetching notes:', error);
        return [];
    }
}

async function getUniversityStats() {
    try {
        const [[{ total: totalSchools }]] = await db.query('SELECT COUNT(*) as total FROM schools');
        const [[{ total: totalDepartments }]] = await db.query('SELECT COUNT(*) as total FROM courses');
        const [[{ total: totalUnits }]] = await db.query('SELECT COUNT(*) as total FROM units');
        const [[{ total: totalNotes }]] = await db.query('SELECT COUNT(*) as total FROM notes');
        
        return {
            totalSchools: totalSchools || 0,
            totalDepartments: totalDepartments || 0,
            totalUnits: totalUnits || 0,
            totalNotes: totalNotes || 0
        };
    } catch (error) {
        console.error('Error fetching stats:', error);
        return { totalSchools: 0, totalDepartments: 0, totalUnits: 0, totalNotes: 0 };
    }
}

async function getPopularDepartments(limit = 3) {
    try {
        const [rows] = await db.query(`
            SELECT c.*, s.name as schoolName 
            FROM courses c 
            JOIN schools s ON c.school_id = s.id 
            ORDER BY c.name 
            LIMIT ?
        `, [limit]);
        return rows;
    } catch (error) {
        console.error('Error fetching popular departments:', error);
        return [];
    }
}

async function addSchool(name) {
    try {
        const [existing] = await db.query('SELECT * FROM schools WHERE name = ?', [name]);
        if (existing.length > 0) {
            return { id: existing[0].id, name, exists: true };
        }
        const [result] = await db.query('INSERT INTO schools (name) VALUES (?)', [name]);
        return { id: result.insertId, name };
    } catch (error) {
        console.error('Error adding school:', error);
        return null;
    }
}

async function addDepartment(schoolId, name, code) {
    try {
        const [existing] = await db.query(
            'SELECT * FROM courses WHERE (name = ? OR code = ?) AND school_id = ?',
            [name, code, schoolId]
        );
        if (existing.length > 0) {
            return { id: existing[0].id, school_id: schoolId, name, code, exists: true };
        }
        const [result] = await db.query('INSERT INTO courses (school_id, name, code) VALUES (?, ?, ?)', [schoolId, name, code]);
        return { id: result.insertId, school_id: schoolId, name, code };
    } catch (error) {
        console.error('Error adding department:', error);
        return null;
    }
}

async function addUnit(schoolId, deptId, name, code) {
    try {
        const [existing] = await db.query(
            'SELECT * FROM units WHERE (name = ? OR code = ?) AND dept_id = ?',
            [name, code, deptId]
        );
        if (existing.length > 0) {
            return { id: existing[0].id, dept_id: deptId, name, code, exists: true };
        }
        const [result] = await db.query('INSERT INTO units (dept_id, name, code) VALUES (?, ?, ?)', [deptId, name, code]);
        return { id: result.insertId, dept_id: deptId, name, code };
    } catch (error) {
        console.error('Error adding unit:', error);
        return null;
    }
}

async function addNote(schoolId, deptId, unitId, noteData) {
    try {
        const [result] = await db.query(
            'INSERT INTO notes (user_id, school_id, dept_id, unit_id, title, description, file_path) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [noteData.userId || 1, schoolId, deptId, unitId, noteData.title, noteData.description || '', noteData.filePath || null]
        );
        
        const [newNote] = await db.query(`
            SELECT n.*, s.name as schoolName, c.name as deptName, u.name as unitName,
                   s.id as schoolId, c.id as deptId, u.id as unitId,
                   p.name as uploadedByName
            FROM notes n
            LEFT JOIN schools s ON n.school_id = s.id
            LEFT JOIN courses c ON n.dept_id = c.id
            LEFT JOIN units u ON n.unit_id = u.id
            LEFT JOIN notify_users p ON n.user_id = p.id
            WHERE n.id = ?
        `, [result.insertId]);
        
        return newNote[0];
    } catch (error) {
        console.error('Error adding note:', error);
        return null;
    }
}

async function deleteNote(schoolId, deptId, unitId, noteId) {
    try {
        await db.query('DELETE FROM notes WHERE id = ?', [noteId]);
        return true;
    } catch (error) {
        console.error('Error deleting note:', error);
        return false;
    }
}

async function addUpdate(updateData) {
    try {
        const [result] = await db.query(
            'INSERT INTO updates (user_id, course_id, title, content) VALUES (?, ?, ?, ?)',
            [updateData.userId || 1, updateData.course_id || null, updateData.title, updateData.content]
        );
        return { id: result.insertId, ...updateData };
    } catch (error) {
        console.error('Error adding update:', error);
        return null;
    }
}

module.exports = {
    getSchools,
    getSchoolById,
    getDepartmentsBySchool,
    getDepartmentById,
    getUnitsByDepartment,
    getUnitById,
    getNotesByUnit,
    getUniversityStats,
    getPopularDepartments,
    addSchool,
    addDepartment,
    addUnit,
    addNote,
    deleteNote,
    addUpdate
};
