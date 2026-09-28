# Unity プロジェクト (Kure-Hanabi2026-2-web) の FBX を、ゲームで読む GLB に書き出す (Blender で実行)
#   blender -b --factory-startup --python tools/convert_models.py -- <Unity の Assets フォルダ>
#
#   public/models/yamato_museum.glb  大和ミュージアムの建物 (PlateauFBX/yamato-musium0526.fbx の本体だけ、実写風テクスチャ付き)
#   data/models_private/yamato.glb   戦艦大和 (いまは配信しない) (OriginalAsset/1077519.gltf を実寸 263m に拡大)
#
# どちらも glTF の座標 (x = 東, y = 上, z = 南) で、ゲームのワールド座標と同じ向き。
#   大和ミュージアム: 本体の外接矩形の中心が原点。y は標高 (T.P.) のまま (地面は約 3.1m)
#   戦艦大和: 船体の中心が原点、艦底が y = 0、艦首が -z
import os
import sys
import bmesh
import bpy
from mathutils import Vector

ASSETS = sys.argv[sys.argv.index('--') + 1]
OUT = os.path.abspath('public/models')
os.makedirs(OUT, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def apply_all(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def export(path, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True,
                              export_image_format='JPEG', export_jpeg_quality=85,
                              export_yup=True, export_apply=True, export_animations=False)
    print('wrote', path, os.path.getsize(path), 'bytes')


# ---------------- 大和ミュージアム ----------------
reset()
bpy.ops.import_scene.fbx(filepath=os.path.join(ASSETS, 'PlateauFBX', 'yamato-musium0526.fbx'))
# PLATEAU の建物がまとめて入っている。専用のテクスチャを貼った 2 棟だけ使う:
#   本体 (マテリアル名「マテリアル」) と、南東の呉中央桟橋ターミナル (「Yanato-dome…」、緑の屋根)
# Unity の座標 (x = 東, z = 北) から FBX を経て Blender に入ると x と y が両方反転する (180 度回る)。
# Unity のシーン (WebOptimized/CombinedMeshes の cell_-1_1_マテリアル_0 と cell_0_1_Yanato-dome001_002_0) と
# 同じ配置になるよう、ここで 180 度回して東・北に戻す。OSM の輪郭とも平均 1.6m で一致する。
keep = [o for o in bpy.context.scene.objects if o.type == 'MESH' and any(m and (m.name == 'マテリアル' or m.name.startswith('Yanato-dome')) for m in o.data.materials)]
main_obj = [o for o in keep if any(m and m.name == 'マテリアル' for m in o.data.materials)][0]
for o in list(bpy.context.scene.objects):
    if o not in keep:
        bpy.data.objects.remove(o, do_unlink=True)
apply_all(keep)
for o in keep:
    # FBX はセンチ扱いで取り込まれて 1/100 になっているので、メートルへ戻す
    for v in o.data.vertices:
        v.co *= 100
        v.co.x, v.co.y = -v.co.x, -v.co.y
pts = [v.co for v in main_obj.data.vertices]
cx = (min(p.x for p in pts) + max(p.x for p in pts)) / 2
cy = (min(p.y for p in pts) + max(p.y for p in pts)) / 2
for o in keep:
    for v in o.data.vertices:
        v.co.x -= cx
        v.co.y -= cy
dome = [o for o in keep if o is not main_obj][0]
dp = [v.co for v in dome.data.vertices]
print('DOME offset from museum center (east, north)', (min(p.x for p in dp) + max(p.x for p in dp)) / 2, (min(p.y for p in dp) + max(p.y for p in dp)) / 2)
print('MUSEUM size', max(p.x for p in pts) - min(p.x for p in pts), max(p.y for p in pts) - min(p.y for p in pts), 'z', min(p.z for p in pts), max(p.z for p in pts))
export(os.path.join(OUT, 'yamato_museum.glb'), keep)

# ---------------- 戦艦大和 ----------------
# OriginalAsset/1077519.gltf (模型の縮尺で全長 38m、長手が x)。テクスチャ (木の甲板・塗装) はそのまま使う
reset()
bpy.ops.import_scene.gltf(filepath=os.path.join(ASSETS, 'OriginalAsset', '1077519.gltf'))
ship = [o for o in bpy.context.scene.objects if o.type == 'MESH']
# glTF は親ノードに縮尺を持っているので、親を消す前に各メッシュのワールド変換を頂点へ焼き込む
from mathutils import Matrix
for o in ship:
    mw = o.matrix_world.copy()
    if o.data.users > 1:
        o.data = o.data.copy()
    o.data.transform(mw)
    o.parent = None
    o.matrix_world = Matrix.Identity(4)
for o in list(bpy.context.scene.objects):
    if o not in ship:
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for o in ship:
    o.select_set(True)
bpy.context.view_layer.objects.active = ship[0]
bpy.ops.object.join()
o = bpy.context.view_layer.objects.active
me = o.data
pts = [v.co.copy() for v in me.vertices]
xmin, xmax = min(p.x for p in pts), max(p.x for p in pts)
zmin = min(p.z for p in pts)
L = xmax - xmin
SCALE = 263.0 / L   # 全長 263m (実物) に合わせる
# 艦首と艦尾: 艦尾は角ばった (トランサム) ので、端から 3% の所の幅が広いほうを艦尾とする
def width_near(x0, x1):
    ys = [p.y for p in pts if x0 <= p.x <= x1]
    return (max(ys) - min(ys)) if ys else 0
w_lo, w_hi = width_near(xmin, xmin + L * 0.03), width_near(xmax - L * 0.03, xmax)
bow_is_high_x = w_hi < w_lo
print('YAMATO length', L, 'scale', SCALE, 'end widths', w_lo, w_hi, 'bow at', '+x' if bow_is_high_x else '-x')
cx = (xmin + xmax) / 2
cy = (min(p.y for p in pts) + max(p.y for p in pts)) / 2
for v in me.vertices:
    x, y, z = v.co.x - cx, v.co.y - cy, v.co.z - zmin
    # 艦首を +y (glTF では -z) にそろえる (x 軸 → y 軸へ 90 度回す)
    if bow_is_high_x:
        v.co.x, v.co.y = -y, x
    else:
        v.co.x, v.co.y = y, -x
    v.co.z = z
    v.co *= SCALE
me.update()
pts = [v.co for v in me.vertices]
print('YAMATO size', max(p.x for p in pts) - min(p.x for p in pts), max(p.y for p in pts) - min(p.y for p in pts), max(p.z for p in pts))
# 再配布の条件を確認するまで配信しない (public/ ではなく data/models_private/ へ。.gitignore 済み)
PRIVATE = os.path.abspath('data/models_private')
os.makedirs(PRIVATE, exist_ok=True)
export(os.path.join(PRIVATE, 'yamato.glb'), [o])
