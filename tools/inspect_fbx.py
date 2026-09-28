# FBX の中身 (オブジェクト・大きさ・位置・マテリアルとテクスチャ) を表示する (Blender で実行)
#   blender -b --factory-startup --python tools/inspect_fbx.py -- <file.fbx>
import sys
import bpy
from mathutils import Vector

path = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=path)
lo = Vector((1e18, 1e18, 1e18))
hi = Vector((-1e18, -1e18, -1e18))
for o in bpy.context.scene.objects:
    line = f'{o.type:8s} {o.name!r} loc={tuple(round(v, 2) for v in o.location)} rot={tuple(round(v, 3) for v in o.rotation_euler)} scale={tuple(round(v, 4) for v in o.scale)}'
    if o.type == 'MESH':
        pts = [o.matrix_world @ v.co for v in o.data.vertices]
        a = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
        b = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
        lo = Vector((min(lo.x, a.x), min(lo.y, a.y), min(lo.z, a.z)))
        hi = Vector((max(hi.x, b.x), max(hi.y, b.y), max(hi.z, b.z)))
        line += f' verts={len(o.data.vertices)} tris~{sum(len(p.vertices) - 2 for p in o.data.polygons)} bbox={tuple(round(v, 2) for v in a)}..{tuple(round(v, 2) for v in b)}'
        for m in o.data.materials:
            if not m:
                continue
            imgs = [n.image.filepath for n in (m.node_tree.nodes if m.node_tree else []) if n.type == 'TEX_IMAGE' and n.image]
            line += f'\n           mat {m.name!r} images={imgs}'
    print(line)
print('WORLD BBOX', tuple(round(v, 2) for v in lo), tuple(round(v, 2) for v in hi), 'size', tuple(round(v, 2) for v in (hi - lo)))
