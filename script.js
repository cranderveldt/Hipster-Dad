/*To work on next time:
-if you have problems, you might want to check your substr/substring methods
-add bouncing ball, make it do damage!
-figure out write to sql with node.js
Bugs:
need to disable scrolling arrow keys (custom controls has helped this a bit)
figure out how to reset the game without forcing a player to refresh
custom control changing is a little wonky, and I would like to put that in a new javascript file anyway
-if you double click on one then click off it always return to original default.
-need a defaults button
-need to figure out how to end events once they start. that will likely solve all the problems i'm having
*/

jQuery(document).ready(function($){
  var keyAssignments = {}
  var startingRoom = 4;
  var currentRoom = {};
  var roomList = {
    'HTML' : [],
    'classes' : []
  };
  var player = {};
  var elements = null;
  var move = function(horz, vert) {
    var currentLeft = player.left;
    var currentTop = player.top;
    var results = {};
    
    if (vert < 0) {
      results = calcUp(currentTop, player.inc, elements);
      if (results.lowest === player.inc && !results.isElm) {
        updatePlayerTop(currentTop+(vert*results.inside), true);
      } else {
        updatePlayerTop(currentTop+(vert*results.lowest), true);
      }
      setDirection('up', false);
    }
    
    if (vert > 0) {
      results = calcDown(currentTop, player.inc, elements);
      if (results.lowest === player.inc && !results.isElm) {
        updatePlayerTop(currentTop+(vert*results.inside), true);
      } else {
        updatePlayerTop(currentTop+(vert*results.lowest), true);
      }
      setDirection('down', false);
    } 
    if (horz < 0) {
      results = calcLeft(currentLeft, player.inc, elements);
      if (results.lowest === player.inc && !results.isElm) {
        updatePlayerLeft(currentLeft+(horz*results.inside), true);
      } else {
        updatePlayerLeft(currentLeft+(horz*results.lowest), true);
      }
      setDirection('left', false);
    }
    if (horz > 0) {
      results = calcRight(currentLeft, player.inc, elements);
      if (results.lowest === player.inc && !results.isElm) {
        updatePlayerLeft(currentLeft+(horz*results.inside), true);
      } else {
        updatePlayerLeft(currentLeft+(horz*results.lowest), true);
      }
      setDirection('right', false);
    }
    if (results.exit) {
      saveRoom(currentRoom, currentRoom.pos);
      currentRoom = setRoom(currentRoom,results.exitElm.exitRoomNumber, currentRoom.pos, $(results.exitElm));
    }
    if (results.locked) {
      addData($(results.lockedElm).find('span.locked').html());
    }
    if (results.hurt > 0) {
      player.currentHealth -= results.hurt;
      updateHealth(player.currentHealth);
      if (player.currentHealth <= 0) {
        gameOver();
        
      }
    }
    checkforAchievements(results, currentRoom.pos);
  };
  var gameOver = function() {
    addData('You are dead.');
    $('#title').css('display','block');
    $('#player').css('display','none');
    $('#title').html('<h1 class="dead">YOU ARE DEAD</h1><p class="dead">You died an ironic death.</p><p class="dead">Final Score: ' + player.money + '</p><input id="post_score" style="display: none;" type="button" value="Post Your Score"><input id="play_again" type="button" class="button" value="Play Again">');
    $('#music').html('');
    $('#sound').addClass('off');
    player.paused = true;
    $('#play_again').live('click', function() {
      location.reload(true);
    });
    $('#post_score').live('click', function() {
      //write to database
    });
  }
  //These calculations check to see if inside movement is legal, then default to whatever outside movement finds
  var calcUp = function (top, inc, elms) {
    var inside = calcInsideUp(top, inc);
    var outside = calcOutsideUp(elms, inc);
    outside.inside = inside.lowest;
    return outside;
  };
  var calcDown = function (top, inc, elms) {
    var inside = calcInsideDown(top, inc);
    var outside = calcOutsideDown(elms, inc);
    outside.inside = inside.lowest;
    return outside;
  };
  var calcLeft = function (left, inc, elms) {
    var inside = calcInsideLeft(left, inc);
    var outside = calcOutsideLeft(elms, inc);
    outside.inside = inside.lowest;
    return outside;
  };
  var calcRight = function (left, inc, elms) {
    var inside = calcInsideRight(left, inc);
    var outside = calcOutsideRight(elms, inc);
    outside.inside = inside.lowest;
    return outside;
  };
  //These methods return how much you can legally move inside the frame
  var calcInsideUp = function(top, inc) {
    var results = {
      'lowest' : inc,
      'elm' : null
    };
    if (top >= (0 + inc)) {
      results.lowest =  inc;
    } else if (top === 0) {
      results.lowest =  0;
    } else {
      results.lowest =  top;
    }
    return results;
  }
  var calcInsideDown = function(top, inc) {
    var results = {
      'lowest' : inc,
      'elm' : null
    };
    if (top + player.heightUsed < currentRoom.height - inc) {
      results.lowest = inc;
    } else if (top + player.heightUsed === currentRoom.height) {
      results.lowest = 0;
    } else {
      results.lowest = (currentRoom.height - top - player.heightUsed);
    }
    return results;
  }
  var calcInsideLeft = function(left, inc) {
    var results = {
      'lowest' : inc,
      'elm' : null
    };
    if (left >= (0 + inc)) {
      results.lowest =  inc;
    } else if (left === 0) {
      results.lowest =  0;
    } else {
      results.lowest =  left;
    }
    return results;
  }
  var calcInsideRight = function(left, inc) {
    var results = {
      'lowest' : inc,
      'elm' : null
    };
    if (left + player.width < currentRoom.width - inc) {
      results.lowest =  inc;
    } else if (left + player.width === currentRoom.width) {
      results.lowest =  0;
    } else {
      results.lowest = (currentRoom.width - left - player.width);
    }
    return results;
  }
  //These methods return how much you can legally move when taking into account the positions of all the elements in the room
  var calcOutsideUp = function(elms, inc) {
    var space = {};
    var results = {
      'lowest' : inc,
      'elm' : null
    };
    for(var i = 0; i < elms.length; i+=1) {
      var e = {
        'width' : $(elms[i]).width(),
        'height' : $(elms[i]).height(),
        'top' : parseInt($(elms[i]).css('top')),
        'left' : parseInt($(elms[i]).css('left'))
      }
      var p = {
        'width' : player.width,
        'height' : player.heightUsed,
        'top' : player.top,
        'left' : player.left
      }
      if (p.top >= e.top + e.height + inc) {
        space['v' + i] = inc;
      } else if (p.left + p.width > e.left && p.left < e.left + e.width) {
          if (p.top === e.top + e.height) {
            space['v' + i] = 0;
          } else if (p.top + p.height < e.top){
            space['v' + i] = inc;
          } else if (p.top < e.top + e.height + inc && p.top > e.top + e.height) {
            space['v' + i] = p.top - (e.top + e.height);
          }
      } else {
        space['v' + i] = inc;
      }
      if (space['v' + i] < results.lowest && !elms[i].passThru) {
        results.lowest = space['v' + i];
      }
      results = checkElmConditions(results, space['v' + i], inc, elms[i], i);
    }
    return results;
  }
  var calcOutsideDown = function(elms, inc) {
    var space = {};
    var results = {
      'lowest' : inc,
      'elm' : null
    };
    for(var i = 0; i < elms.length; i+=1) {
      var e = {
        'width' : $(elms[i]).width(),
        'height' : $(elms[i]).height(),
        'top' : parseInt($(elms[i]).css('top')),
        'left' : parseInt($(elms[i]).css('left'))
      }
      var p = {
        'width' : player.width,
        'height' : player.heightUsed,
        'top' : player.top,
        'left' : player.left
      }
      if (p.top + p.height <= e.top - inc) {
        space['v' + i] = inc;
      } else if (p.left + p.width > e.left && p.left < e.left + e.width) {
          if (p.top + p.height === e.top) {
            space['v' + i] = 0;
          } else if (p.top > e.top + e.height){
            space['v' + i] = inc;
          } else if (p.top + p.height > e.top - inc && p.top + p.height < e.top) {
            space['v' + i] = e.top - (p.top + p.height); 
          }
      } else {
        space['v' + i] = inc;
      }
      if (space['v' + i] < results.lowest && !elms[i].passThru) {
        results.lowest = space['v' + i];
      }
      results = checkElmConditions(results, space['v' + i], inc, elms[i], i);
    }
    return results;
  }
  var calcOutsideLeft = function(elms, inc) {
    var space = {};
    var results = {
      'lowest' : inc,
      'elm' : null
    };
    for(var i = 0; i < elms.length; i+=1) {
      var e = {
        'width' : $(elms[i]).width(),
        'height' : $(elms[i]).height(),
        'top' : parseInt($(elms[i]).css('top')),
        'left' : parseInt($(elms[i]).css('left'))
      }
      var p = {
        'width' : player.width,
        'height' : player.heightUsed,
        'top' : player.top,
        'left' : player.left
      }
      if (p.left >= e.left + e.width + inc) {
        space['v' + i] = inc;
      } else if (p.top + p.height > e.top && p.top < e.top + e.height) {
          if (p.left === e.left + e.width) {
            space['v' + i] = 0;
          } else if (p.left + p.width < e.left){
            space['v' + i] = inc;
          } else if (p.left < e.left + e.width + inc && p.left > e.left + e.width) {
            space['v' + i] = p.left - (e.left + e.width);
          }
      } else {
        space['v' + i] = inc;
      }
      if (space['v' + i] < results.lowest && !elms[i].passThru) {
        results.lowest = space['v' + i];
      }
      results = checkElmConditions(results, space['v' + i], inc, elms[i], i);
    }
    return results;
  }
  var calcOutsideRight = function(elms, inc) {
    var space = {};
    var results = {
      'lowest' : inc,
      'elm' : null
    };
    for(var i = 0; i < elms.length; i+=1) {
      var e = {
        'width' : $(elms[i]).width(),
        'height' : $(elms[i]).height(),
        'top' : parseInt($(elms[i]).css('top')),
        'left' : parseInt($(elms[i]).css('left'))
      }
      var p = {
        'width' : player.width,
        'height' : player.heightUsed,
        'top' : player.top,
        'left' : player.left
      }
      if (p.left + p.width <= e.left - inc) {
        space['v' + i] = inc;
      } else if (p.top + p.height > e.top && p.top < e.top + e.height) {
          if (p.left + p.width === e.left) {
            space['v' + i] = 0;
          } else if (p.left > e.left + e.width){
            space['v' + i] = inc;
          } else if (p.left + p.width > e.left - inc && p.left + p.width < e.left) {
            space['v' + i] = e.left - (p.left + p.width); 
          }
      } else {
        space['v' + i] = inc;
      }
      if (space['v' + i] < results.lowest && !elms[i].passThru) {
        results.lowest = space['v' + i];
      }
      results = checkElmConditions(results, space['v' + i], inc, elms[i], i);
    }
    return results;
  }
  var checkElmConditions = function(results, space, inc, elm, pos) {
    if (space < inc && elm.mobile) {
      results.mobileElm = elm;
      results.mobile = true;
      results.mobilePos = pos;
      results.isElm = true;
      results.playerSprite = elm.playerSprite;
    }
    if (space < inc && elm.messages !== null) {
      results.messageElm = elm;
      results.message = true;
      results.messageOutfitDependent = $(elm).attr('class').indexOf('outfit-dependent') !== -1;
      results.messageEquipDependent = $(elm).attr('class').indexOf('equip-dependent') !== -1;
      results.messagePos = pos;
      results.isElm = true;
    }
    if (space < inc && elm.interactions !== null) {
      results.interactElm = elm;
      results.interact = true;
      results.interactOutfitDependent = $(elm).attr('class').indexOf('outfit-dependent') !== -1;
      results.interactEquipDependent = $(elm).attr('class').indexOf('equip-dependent') !== -1;
      results.interactPos = pos;
      results.isElm = true;
    }
    if (space === 0 && elm.exit && !elm.locked) {
      results.exitElm = elm;
      results.exit = true;
      results.lockedPos = pos;
      results.isElm = true;
    }
    if (space === 0 && elm.exit && elm.locked) {
      results.lockedElm = elm;
      results.locked = true;
      results.exitPos = pos;
      results.isElm = true;
    }
    if (space < inc && elm.container) {
      results.containerElm = elm;
      results.container = true;
      results.containerPos = pos;
      results.isElm = true;
    }
    if (space === 0 && elm.hurt > 0) {
      results.hurtElm = elm;
      results.hurt = elm.hurt;
      results.hurtPos = pos;
      results.isElm = true;
    }
    if (space < inc && elm.gun) {
      results.gunElm = elm;
      results.gun = true;
      results.gunPos = pos;
      results.isElm = true;
    }
    if (space < inc && elm.money) {
      results.moneyElm = elm;
      results.money = true;
      results.moneyPos = pos;
      results.isElm = true;
    }
    if (space < inc && elm.person) {
      results.personElm = elm;
      results.person = true;
      results.personPos = pos;
      results.isElm = true;
    }
    if (space < inc && elm.dead) {
      results.deadElm = elm;
      results.dead = true;
      results.deadPos = pos;
      results.isElm = true;
    }
    return results;
  }
  var setDirection = function(dir, newOutfit) {
    if (dir === 'up' || dir === 'down' || dir === 'left' || dir === 'right'){
      var oldDir = player.dir;
      player.dir = dir;
      var bgPosTop = player.elm.css('background-position');
      bgPosTop = bgPosTop.substring(bgPosTop.indexOf(' ')+1)
      var shouldSpriteSwitch = !player.isAnimatingFeet || oldDir !== dir;
      if (dir === 'up' && shouldSpriteSwitch) {
        player.isAnimatingFeet = true;
        player.elm.css('background-position', '-' + ((player.width*4)+(player.outfit*player.width*12)) + 'px -' + player.height*player.playerSprite + 'px');
        window.setTimeout(function() {
          player.elm.css('background-position', '-' + ((player.width*8)+(player.outfit*player.width*12)) + 'px -' + player.height*player.playerSprite + 'px');
          window.setTimeout(function() {
            player.elm.css('background-position', '-' + ((player.width*0)+(player.outfit*player.width*12)) + 'px -' + player.height*player.playerSprite + 'px');
            player.isAnimatingFeet = false;
          }, player.speed/2);
        }, player.speed/2);
      } else if (dir === 'up' && newOutfit) {
        player.elm.css('background-position', '-' + ((player.width*0)+(player.outfit*player.width*12)) + 'px -' + player.height*player.playerSprite + 'px');
      }
      if (dir === 'down' && shouldSpriteSwitch) {
        player.isAnimatingFeet = true;
        player.elm.css('background-position','-' + ((player.width*5)+(player.outfit*player.width*12)) + 'px -' + player.height*player.playerSprite + 'px');
        window.setTimeout(function() {
          player.elm.css('background-position', '-' + ((player.width*9)+(player.outfit*player.width*12)) + 'px -' + player.height*player.playerSprite + 'px');
          window.setTimeout(function() {
            player.elm.css('background-position', '-' + ((player.width*1)+(player.outfit*player.width*12)) + 'px -' + player.height*player.playerSprite + 'px');
            player.isAnimatingFeet = false;
          }, player.speed/2);
        }, player.speed/2);
      } else if (dir === 'down' && newOutfit) {
        player.elm.css('background-position', '-' + ((player.width*1)+(player.outfit*player.width*12)) + 'px -' + player.height*player.playerSprite + 'px');
      }
      if (dir === 'left' && shouldSpriteSwitch) {
        player.isAnimatingFeet = true;
        player.elm.css('background-position','-' + ((player.width*6)+(player.outfit*player.width*12)) + 'px -' + player.height*player.playerSprite + 'px');
        window.setTimeout(function() {
          player.elm.css('background-position', '-' + ((player.width*10)+(player.outfit*player.width*12)) + 'px -' + player.height*player.playerSprite + 'px');
          window.setTimeout(function() {
            player.elm.css('background-position', '-' + ((player.width*2)+(player.outfit*player.width*12)) + 'px -' + player.height*player.playerSprite + 'px');
            player.isAnimatingFeet = false;
          }, player.speed/2);
        }, player.speed/2);
      } else if (dir === 'left' && newOutfit) {
        player.elm.css('background-position', '-' + ((player.width*2)+(player.outfit*player.width*12)) + 'px -' + player.height*player.playerSprite + 'px');
      }
      if (dir === 'right' && shouldSpriteSwitch) {
        player.isAnimatingFeet = true;
        player.elm.css('background-position','-' + ((player.width*7)+(player.outfit*player.width*12)) + 'px -' + player.height*player.playerSprite + 'px');
        window.setTimeout(function() {
          player.elm.css('background-position', '-' + ((player.width*11)+(player.outfit*player.width*12)) + 'px -' + player.height*player.playerSprite + 'px');;
          window.setTimeout(function() {
            player.elm.css('background-position', '-' + ((player.width*3)+(player.outfit*player.width*12)) + 'px -' + player.height*player.playerSprite + 'px');
            player.isAnimatingFeet = false;
          }, player.speed/2);
        }, player.speed/2);
      } else if (dir === 'right' && newOutfit) {
        player.elm.css('background-position', '-' + ((player.width*3)+(player.outfit*player.width*12)) + 'px -' + player.height*sprite + 'px');
      }
    }
  }
  var addToInventory = function(elms, pos, m) {
    player.inventory[player.invPos] = m;
    player.inventory[player.invPos].playerSprite = elms[pos].playerSprite;
    player.invPos += 1;
    $(m).remove();
    elms.splice(pos, 1);
    addData('Added ' + player.inventory[player.invPos-1].name + ' to your inventory! Current inventory: ' + listInventory());
    if (player.invPos >= 9) {
      player.full = true;
    }
    updateInventory(player.inventory);
  }
  var action = function(elms, dir, inc) {
    var results = {
      'lowest' : inc
    };
    if (dir === 'up'){
      results = calcOutsideUp(elms, inc);
    } else if (dir === 'down'){
      results = calcOutsideDown(elms, inc);
    } else if (dir === 'left'){
      results = calcOutsideLeft(elms, inc);
    } else if (dir === 'right'){
      results = calcOutsideRight(elms, inc);
    }
    if (results.mobile && !player.full) {
      addToInventory(elms, results.mobilePos, results.mobileElm);
    }
    else if (results.mobile && player.full) {
      addData('Cannot add ' + results.mobileElm.name + ' to your inventory, because it is full.');
    }
    if (results.message) {
      if (results.person) {
        determineMessage(results);
      } else {
        //this is if it's not a person
        addData($(results.messageElm.messages).html());
      }
    }
    if (results.locked) {
      addData($(results.lockedElm).find('span.locked').html());
    }
    if (results.interact) {
      determineInteraction(results, currentRoom.pos);
    }
    /*this assumes the position returned is the container, and we want to remove the elements inside the container, so we add the +1 in the call to addToInventory to results.containerPos to grab the container's child.*/
    if (results.container) {
      var prize = $(results.containerElm).find('div');
      prize.name = $(prize).attr('title');
      if ($(prize).attr('class').indexOf('money') !== -1) {
        var newMoney = parseInt($(prize).find('span.money').html());
        addData('You received $' + newMoney + '!');
        $(results.containerElm).css('background-position','right top');
        $(prize).removeClass('money');
        $(prize).remove();
        updateMoney(newMoney);
      }
      if ($(prize).attr('class').indexOf('mobile') !== -1 && !player.full) {
        addToInventory(elms, results.containerPos+1, prize);
        $(results.containerElm).css('background-position','right top');
      } else if (player.full) {
        addData('Cannot add ' + prize.name + ' to your inventory, because it is full.');
      } 
    }
    checkforAchievements(results, currentRoom.pos);
  }
  var updateHealth = function(health) {
    var lis = $('#health li');
    if (health % 2 === 0) {
      for (var i = health/2; i < lis.length; i+=1) {
        $(lis[i]).css('background-position','right top');
      }
    }
    else {
      var halfHealth = Math.floor(health/2);
      $(lis[halfHealth]).css('background-position','-22px top');
      for (var i = halfHealth+1; i < lis.length; i+=1) {
        $(lis[i]).css('background-position','right top');
      }
    }
  }
  var playMusic = function() {
    var music = '<audio controls="controls" autoplay="autoplay" loop="loop" class="audio" height="50px" width="100px"><source src="media/ipatch.mp3" type="audio/mpeg" /><source src="media/ipatch.ogg" type="audio/ogg" /><embed class="audio" height="50px" width="100px" src="media/ipatch.mp3" /></audio>';
    /*$('#music').html(music);*/
    $('#sound').live('click', function() {
      if($('#music').html() === '') {
        $('#music').html(music);
        $('#sound').removeClass('off');
      } else {
        $('#music').html('');
        $('#sound').addClass('off');
      }
    });
  }
  var changePlayerSprite = function(sprite) {
    player.playerSprite = sprite;
    setDirection(player.dir, true);
  }
  var changePlayerOutfit = function(outfit) {
    player.outfit = outfit;
    setDirection(player.dir, true);
  }
  var updateMoney = function(money) {
    player.money += money;
    $('#money').html('$' + player.money);
  }
  var determineMessage = function(results) {
    //messages default to equipDependent results, then to outfit dependent ones
    if (results.messageOutfitDependent && !results.messageEquipDependent) {
      for (var i = 0; i < results.messageElm.messages.length; i += 1) {
        var str = $(results.messageElm.messages[i]).attr('class');
        var outfit = parseInt(str.substr(str.indexOf('outfit')+6,1));
        if (outfit === player.outfit) {
          addData($(results.messageElm.messages[i]).html());
        }
      }
    } else if (results.messageEquipDependent && !results.messageOutfitDependent) {
      for (var i = 0; i < results.messageElm.messages.length; i += 1) {
        var str = $(results.messageElm.messages[i]).attr('class');
        var equip = parseInt(str.substring(str.indexOf('equip')+5));
        if (equip === player.playerSprite) {
          addData($(results.messageElm.messages[i]).html());
        }
      }
    } else if (!results.messageEquipDependent && !results.messageOutfitDependent) {
      addData($(results.messageElm.messages).html());
    } else if (results.messageEquipDependent && results.messageOutfitDependent) {
      var finalMessage = '';
      for (var i = 0; i < results.messageElm.messages.length; i += 1) {
        var str = $(results.messageElm.messages[i]).attr('class');
        var equip = parseInt(str.substring(str.indexOf('equip')+5));
        var outfit = parseInt(str.substr(str.indexOf('outfit')+6,1));
        if (equip === player.playerSprite) {
          finalMessage = $(results.messageElm.messages[i]).html();
        } else if (outfit === player.outfit) {
          finalMessage = $(results.messageElm.messages[i]).html();
        }
      }
      addData(finalMessage);
    }
  }
  var achievementUnlocked = function(str) {
    $('#achievement').html('<span>Achievement Unlocked</span>' + str);
    addData('Achievement Unlocked<br/>' + str);
    $('#achievement').stop().show(500).delay(5000).hide(500);
    return true;
  }
  var roomAchievements = {
    'room2' : function(results) {
      if (!player.achievements[0] && player.eventList.piggySmashed) {
        player.achievements[0] = achievementUnlocked('<strong>Bad Dad:</strong> Smash your daugher\'s piggy bank.');
      }
    },
    'room6' : function(results) {
      if (!player.achievements[1] && player.outfit === 0) {
        player.achievements[1] = achievementUnlocked('<strong>Brave Nude World:</strong> Go outside without getting dressed.');
      }
    }
  }
  //achievements are ROOM SPECIFIC, which may not always be the best method, be aware
  //also now this if statement has to specify which rooms have achievements, which is really bad
  var checkforAchievements = function(results, roomNumber) {
    if (roomNumber === 2 || roomNumber === 6) {
      roomAchievements['room' + roomNumber](results);
    }
  }
  var roomInteractions = {
    'room0' : function(results) {
      $('#dressed_yes').live('click', function() {
        changePlayerOutfit(1);
        hideOverlay();
      });
      $('#undressed_yes').live('click', function() {
        changePlayerOutfit(0);
        hideOverlay();
      });
      $('#change_clothes_no').live('click', function() {
        hideOverlay();
      });
    },
    'room1' : function(results) {},
    'room2' : function(results) {
      $('#piggy_smash_yes').live('click', function() {
        var theMoney = $(results.interactElm).find('div');
        if ($(theMoney).attr('class').indexOf('money') !== -1) {
          var newMoney = parseInt($(theMoney).find('span.money').html());
          addData('You took $25 from your daughter\'s piggy bank. You are terrible.');
          $(results.interactElm).css('background-position','right top');
          $(theMoney).removeClass('money');
          $(theMoney).remove();
          updateMoney(newMoney);
          $(results.interactElm).removeClass('interact');
          elements[results.interactPos].interact = null;
          results.interact = false;
          player.eventList.piggySmashed = true;
        }
        hideOverlay();
      });
      $('#piggy_smash_no').live('click', function() {
        hideOverlay();
      });
    },
    'room3' : function(results){},
    'room4' : function(results) {
      //this method messes up if you logout and try to log back in, something to do with the .live making multiple instances of each ID
      $('#computer_pin_submit').click(function() {
        var pinID = parseInt($('#computer_pin_ID').val());
        if (!isNaN(pinID) && pinID === 3830) {
          changeOverlay('<h3 class="bank">CoolBank Online</h3><p>You are now logged in to your account. What would you like to do?</p><input id="computer_withdraw_20" type="button" value="Withdraw $20"><input id="computer_withdraw_all" type="button" value="Withdraw All My Money"><input id="computer_logout" type="button" value="Log Out">');
        } else {
          changeOverlayP('We\'re sorry, that PIN is incorrect, please try again.');
        }
      });
      $('#computer_withdraw_20').live('click', function() {
        if (player.bankAccount >= 20) {
          player.bankAccount -= 20;
          updateMoney(20);
          changeOverlayP('$20 has successfully been transferred into your pocket. Magic!');
        } else {
          changeOverlayP('We\'re sorry, you do not have that much money in your account at this time. If you would like to empty your account, please select "Withdraw All My Money."');
        }
      });
      $('#computer_withdraw_all').live('click', function() {
        if (player.bankAccount > 0) {
          changeOverlayP('$' + player.bankAccount + ' has successfully been transferred into your pocket. Magic! Your account is empty, you cannot have any more money.');
          updateMoney(player.bankAccount);
          player.bankAccount = 0;
        } else {
          changeOverlayP('Your account is empty, you cannot have any more money.');
        }
      });
      $('#computer_logout').live('click', function() {
        hideOverlay();
      });
    },
    'room5' : function(results){},
    'room6' : function(results){},
    'room7' : function(results){}
  }
  //interactions default to equipDependent results, then to outfit dependent ones
  var determineInteraction = function(results, roomNumber) {
    if (results.interactOutfitDependent && !results.interactEquipDependent) {
      for (var i = 0; i < results.interactElm.interactions.length; i += 1) {
        var str = $(results.interactElm.interactions[i]).attr('class');
        var outfit = parseInt(str.substr(str.indexOf('outfit')+6,1));
        if (outfit === player.outfit) {
          showOverlay($(results.interactElm.interactions[i]).html());
        }
      }
    } else if (results.interactEquipDependent && !results.interactOutfitDependent) {
      for (var i = 0; i < results.interactElm.interactions; i += 1) {
        var str = $(results.interactElm.interactions[i]).attr('class');
        var equip = parseInt(str.substring(str.indexOf('equip')+5));
        if (equip === player.playerSprite) {
          showOverlay($(results.interactElm.interactions[i]).html());
        }
      }
    } else if (!results.messageEquipDependent && !results.messageOutfitDependent) {
      showOverlay($(results.interactElm.interactions).html());
    } else if (results.messageEquipDependent && results.messageOutfitDependent) {
      var finalInteraction = '';
      for (var i = 0; i < results.interactElm.interactions.length; i += 1) {
        var str = $(results.interactElm.interactions[i]).attr('class');
        var equip = parseInt(str.substring(str.indexOf('equip')+5));
        var outfit = parseInt(str.substr(str.indexOf('outfit')+6,1));
        if (equip === player.playerSprite) {
          finalInteraction = $(results.interactElm.interactions[i]).html();
        } else if (outfit === player.outfit) {
          finalInteraction = $(results.interactElm.interactions[i]).html();
        }
      }
      addData(finalInteraction);
    }
    roomInteractions['room' + roomNumber](results);
  }
  var showOverlay = function(str) {
    $('#overlay').html(str);
    $('#overlay').css('display','block');
    player.paused = true;
  }
  var hideOverlay = function() {
    $('#overlay').css('display','none');
    player.paused = false;
  }
  var changeOverlay = function(str) {
    $('#overlay').html(str);
  }
  var changeOverlayP = function(str) {
    $('#overlay p').html(str);
  }
  var addData = function(str) {
    $('#data').html('<p>' + str + '</p>' + $('#data').html());
    dataP = $('#data').find('p');
    $('#data').find('p').stop().delay(5000).animate({ color : '#AAA', opacity: .25 }, 200);
  }
  var listInventory = function() {
    var list = '';
    for (var i = 0; i < player.invPos; i+=1) {
      list = list + player.inventory[i].name + ', ';
    }
    list = list.substring(0,list.lastIndexOf(', ')) + '.';
    return list;
  }
  var selectInvSlot = function(num) {
    var lis = $('#inventory li');
    for (var i = 0; i < lis.length; i+=1) {
      if (i === num) {
        $(lis[i]).css('border-color','blue');
        player.selectedInv = i;
      } else {
        $(lis[i]).css('border-color','white');
      }
    }
    if (player.inventory[num] !== null) {
      addData('Selected ' + player.inventory[num].name);
      if (player.inventory[num].playerSprite !== player.playerSprite) {
        changePlayerSprite(player.inventory[num].playerSprite);
      }
    } else {
      if (player.playerSprite !== 0) {
        changePlayerSprite(0);
      }
    }
  }
  var getElements = function(r) {
    var elms = r.find('#elements div');
    /* Let's break down the classes: 
    mobile : can be picked up and the element disappears
    stuck : cannot be picked up despite other classes. Need to check to make sure this works. Should work like locked does for doors.
    exit : you can walk through these to advance to another room
    locked : when an exit is locked, you will receive a message that the door is locked when you try to walk through it.
    message : this object returns a string to the Data box
    passThru : object ignores collision detection
    container : object returns an element but does not disappear, also the background image for the container should change once the item is taken */
    for (var i = 0; i < elms.length; i +=1) {
      elms[i].name = $(elms[i]).attr('title');
      elms[i].mobile = false;
      elms[i].container = false;
      elms[i].passThru = false;
      elms[i].stuck = false;
      elms[i].exit = false;
      elms[i].locked = false;
      elms[i].messages = null;
      elms[i].interactions = null;
      elms[i].hurt = 0;
      elms[i].playerSprite = 0;
      elms[i].gun = false;
      elms[i].money = false;
      elms[i].person = false;
      elms[i].dead = false;
      if ($(elms[i]).attr('class').indexOf('mobile') !== -1) {
        elms[i].mobile = true;
        elms[i].playerSprite = parseInt($(elms[i]).find('span.sprite').html());
        if (isNaN(elms[i].playerSprite)) {
          elms[i].playerSprite = 0;
        }
      }
      if ($(elms[i]).attr('class').indexOf('stuck') !== -1) {
        elms[i].stuck = true;
      }
      if ($(elms[i]).attr('class').indexOf('exit') !== -1) {
        elms[i].exit = true;
        elms[i].exitRoomNumber = parseInt($(elms[i]).attr('class').substring($(elms[i]).attr('class').indexOf('room')+4));
      }
      if ($(elms[i]).attr('class').indexOf('locked') !== -1) {
        elms[i].locked = true;
      }
      if ($(elms[i]).attr('class').indexOf('message') !== -1) {
        elms[i].messages = $(elms[i]).find('span.message');
      }
      if ($(elms[i]).attr('class').indexOf('passThru') !== -1) {
        elms[i].passThru = true;
      }
      if ($(elms[i]).attr('class').indexOf('container') !== -1) {
        elms[i].container = true;
      }
      if ($(elms[i]).attr('class').indexOf('interact') !== -1) {
       elms[i].interactions = $(elms[i]).find('span.interact');
      }
      if ($(elms[i]).attr('class').indexOf('hurt') !== -1) {
        elms[i].hurt = parseInt($(elms[i]).find('span.hurt').html());
      }
      if ($(elms[i]).attr('class').indexOf('gun') !== -1) {
        elms[i].gun = true;
      }
      if ($(elms[i]).attr('class').indexOf('money') !== -1) {
        elms[i].money = true;
      }
      if ($(elms[i]).attr('class').indexOf('person') !== -1) {
        elms[i].person = true;
      }
      if ($(elms[i]).attr('class').indexOf('dead') !== -1) {
        elms[i].dead = true;
      }
    }
    return elms;
  }
  var initializeRooms = function() {
    /* Rules for creating new rooms/doors: you must have the following classes: exit, roomX, and door-XX. The roomX is the room number the door leads to, and the door-XX corresponds with the connecting door in the next or previous room. */
    var roomElementsHTML = $('#loading li');
    for (var i = 0; i < roomElementsHTML.length; i+=1) {
     roomList.HTML[i] = $(roomElementsHTML[i]).html();
     roomList.classes[i] = $(roomElementsHTML[i]).attr('class');
    }
    $('#loading').remove();
  }
  var setRoom = function(r, pos, prevPos, door) {
    $('#elements').html(roomList.HTML[pos]);
    r.elm = $('#room');
    r.elm.removeClass('inside');
    r.elm.removeClass('outside');
    r.elm.removeClass('room' + prevPos);
    r.elm.addClass('room' + pos);
    r.elm.addClass(roomList.classes[pos]);
    r.name = $(door).attr('title');
    $('#name').html(r.name);
    r.elm.attr('title',r.name);
    r.height = r.elm.height();
    r.width = r.elm.width();
    r.top = parseInt(r.elm.css('top'));
    r.left = parseInt(r.elm.css('left'));
    r.pos = pos;
    elements = getElements(currentRoom.elm);
    if (door !== null) {
      movePlayerOutsideDoor(door, $('#elements').find('.exit'), player.dir, roomList.classes[prevPos], roomList.classes[pos]);
    } else {
      getLocationFromElement(r.elm.find('#start'));
    }
    return r;
  }
  var saveRoom = function(r, pos) {
    roomList.HTML[pos] = r.elm.find('#elements').html();
  }
  var getLocationFromElement = function(elm) {
    var playerStart = {};
    if (elm.html() !== null) {
      var tempStart = elm.html();
      playerStart = {
        'top' : parseInt(tempStart.substring(tempStart.indexOf('top:') + 4,tempStart.indexOf('px,'))),
        'left' : parseInt(tempStart.substring(tempStart.indexOf('left:') + 5))
      };
    } else {
      playerStart = {
        'top' : 50,
        'left' : 50
      };
    }
    setPlayerLocation(playerStart.top, playerStart.left, false);
  }
  var setPlayerLocation = function(top,left, animate) {
    updatePlayerTop(top, animate);
    updatePlayerLeft(left, animate);
  }
  var updatePlayerTop = function(top, animate) {
    if (animate) {
      if (!player.isAnimatingLeft && !player.isAnimatingTop) {
        player.top = top;
        player.topUsed = top-player.heightReduction;
        player.isAnimatingTop = true;
        player.elm.stop().animate({ top : player.topUsed + 'px', left : player.left + 'px' }, player.speed, function() {
          player.isAnimatingTop = false;
        });
      }
    } else {
      player.top = top;
      player.topUsed = top-player.heightReduction;
      player.elm.stop();
      player.isAnimatingTop = false;
      player.isAnimatingLeft = false;
      player.elm.css('top', player.topUsed + 'px');
    }
  }
  var updatePlayerLeft = function(left, animate) {
    if (animate) {
      if (!player.isAnimatingLeft && !player.isAnimatingTop) {
        player.left = left;
        player.isAnimatingLeft = true;
        player.elm.stop().animate({ top : player.topUsed + 'px', left : player.left + 'px' }, player.speed, function() {
          player.isAnimatingLeft = false;
        });
      }
    } else {
      player.left = left;
      player.elm.stop();
      player.isAnimatingTop = false;
      player.isAnimatingLeft = false;
      player.elm.css('left', player.left + 'px');
    }
  }
  var movePlayerOutsideDoor = function(door, newDoorList, dir, prevClasses, nextClasses) {
    var allClasses = door.attr('class');
    var doorClass = allClasses.substr(allClasses.indexOf('door'),7);
    var isInside = prevClasses.indexOf('inside') !== -1 || nextClasses.indexOf('inside') !== -1;
    for (var i = 0; i < newDoorList.length; i+=1) {
      doorElm = $(newDoorList[i]);
      //these methods assume doors are 7px deep and 40px wide
      if (doorElm.attr('class').indexOf(doorClass) !== -1 && isInside) {
        if (dir === 'up') {
          setPlayerLocation(parseInt(doorElm.css('top'))-player.heightUsed, parseInt(doorElm.css('left')) + ((doorElm.width() - player.width)/2), false);
        }
        if (dir === 'down') {
          setPlayerLocation(parseInt(doorElm.css('top'))+parseInt(doorElm.height()), parseInt(doorElm.css('left')) + ((doorElm.width() - player.width)/2), false);
        }
        if (dir === 'left') {
          setPlayerLocation(parseInt(doorElm.css('top')) + ((doorElm.height() - player.heightUsed)/2), parseInt(doorElm.css('left'))-player.width, false);
        }
        if (dir === 'right') {
          setPlayerLocation(parseInt(doorElm.css('top')) + ((doorElm.height() - player.heightUsed)/2), parseInt(doorElm.css('left')) + doorElm.width(), false);
        }
      }
      if (doorElm.attr('class').indexOf(doorClass) !== -1 && !isInside) {
        if (dir === 'up') {
          setPlayerLocation(parseInt(doorElm.css('top'))-player.heightUsed, player.left, false);
        }
        if (dir === 'down') {
          setPlayerLocation(parseInt(doorElm.css('top'))+parseInt(doorElm.height()), player.left, false);
        }
        if (dir === 'left') {
          setPlayerLocation(player.top, parseInt(doorElm.css('left'))-player.width, false);
        }
        if (dir === 'right') {
          setPlayerLocation(player.top, parseInt(doorElm.css('left')) + doorElm.width(), false);
        }
      }
    }
  }
  var initializeInventory = function() {
    $('#inventory').html('<li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li>');
  }
  var updateInventory = function(inv) {
    var lis = $('#inventory li');
    for (var i = 0; i < lis.length; i +=1) {
      if (inv[i] === null) {
        $(lis[i]).html('');
      } else {
        $(lis[i]).html(inv[i]);
        //this if block is bad. it forces everything to fit inside the inv window but it doesn't account for if both dimensions are too big.
        if ($(lis[i]).width() > $(inv[i]).width()) {
          $(inv[i]).css('top', (($(lis[i]).width() - $(inv[i]).width())/2) + 'px');
        } else {
          $(inv[i]).css('width',$(lis[i]).width() + 'px')
        }
        if ($(lis[i]).height() > $(inv[i]).height()) {
          $(inv[i]).css('left', (($(lis[i]).height() - $(inv[i]).height())/2) + 'px');
        } else {
          $(inv[i]).css('height',$(lis[i]).height() + 'px')
        }
      }
    }
    //optimization problem. it switches back to playerSprite 0 even if the playerSprite is already 0
    if (inv[player.selectedInv] !== null) {
      changePlayerSprite(inv[player.selectedInv].playerSprite);
    }
  }
  var use = function(selected, dir, elms, inc) {
    //change spirte in the appropriate direction
    //deal damage? should be a block of if statements that check if holding this weapon do this, etc
    var equip = player.inventory[selected];
    var results = {
      'lowest' : inc
    };
    
    if (dir === 'up'){
      results = calcOutsideUp(elms, inc);
    }
    if (dir === 'down'){
      results = calcOutsideDown(elms, inc);
    }
    if (dir === 'left'){
      results = calcOutsideLeft(elms, inc);
    }
    if (dir === 'right'){
      results = calcOutsideRight(elms, inc);
    }
    if (equip === null) {
      addData('Nothing equipped.');
    } else if (results.locked && $(equip).attr('class').indexOf('key') !== -1) {
      var equipClasses = $(equip).attr('class');
      var elmClasses = $(results.lockedElm).attr('class');
      var equipDoorClass = equipClasses.substr(equipClasses.indexOf('door'),6);
      var elmDoorClass = elmClasses.substr(elmClasses.indexOf('door'),6);
      if (equipDoorClass === elmDoorClass) {
        $(results.lockedElm).removeClass('locked');
        results.lockedElm.locked = false;
        player.inventory[selected] = null;
        player.invPos -=1;
        updateInventory(player.inventory);
        addData('You used ' + equip.name + ' to unlock the door to the ' + results.lockedElm.name + '.');
      }
    } else if ($(equip).attr('class').indexOf('gun') !== -1) {
      animateBullet(dir, results);
    } else {
      addData('You used ' + equip.name + '! Nothing happened.');
    }
    checkforAchievements(results, currentRoom.pos);
  }
  var killPerson = function(p, e, results, speed) {
    window.setTimeout(function() {
      $(p).css({backgroundPosition: '-' + e.width + 'px 0', width: e.height + 'px', height: e.width + 'px', top: (e.top + e.height - e.width) + 'px'});
    }, speed+100);
    $(p).addClass('dead');
    $(p).removeClass('person');
    $(p).removeClass('message');
    p.dead = true;
    p.messages = null;
    results.message = false;
    results.person = false;
    results.dead = true;
    results.deadElm = results.personElm;
    results.deadPos = results.personPos;
  }
  var checkBulletDamage = function(dir, pX, pY, results) {
    var people = $('#elements div.person');
    for (var i = 0; i < people.length; i +=1) { 
      var e = {
        'width' : $(people[i]).width(),
        'height' : $(people[i]).height(),
        'top' : parseInt($(people[i]).css('top')),
        'left' : parseInt($(people[i]).css('left'))
      }
      if ($(people[i]).attr('class').indexOf('dead') === -1) {
        if (dir === 'up' && e.top <= pY && e.left < pX && (e.left + e.width) > pX) {
          killPerson(people[i], e, results, pY-e.top);
        }
        if (dir === 'down' && e.top >= pY && e.left < pX && (e.left + e.width) > pX) {
          killPerson(people[i], e, results, e.top-pY);
        }
        if (dir === 'left' && e.left <= pX && e.top < pY && (e.top + e.height) > pY) {
          killPerson(people[i], e, results, pX-e.left);
        }
        if (dir === 'right' && e.left >= pX && e.top < pY && (e.top + e.height) > pY) {
          killPerson(people[i], e, results, e.left-pX);
        }
      }
    }
  }
  var animateBullet = function(dir, results) {
    //add new html element with the class of bullet directly in the center of the player. move it in the direction the player is facing and make it go to the outside
    $('#projectiles').append('<div class="bullet"></div>');
    var bullet = $('#projectiles').find('div.bullet');
    var bulletTargetX = player.left + (player.width/2);
    var bulletTargetY = player.topUsed + (player.height/2);
    var bulletSpeed = 100;
    bullet.css('top', bulletTargetY + 'px');
    bullet.css('left', bulletTargetX + 'px');
    if (dir === 'up'){
      bulletSpeed += (Math.floor(bulletTargetY));
      bulletTargetY = 0;
    }
    if (dir === 'down'){
      bulletSpeed += (Math.floor((currentRoom.height-bulletTargetY)));
      bulletTargetY = currentRoom.height;
    }
    if (dir === 'left'){
      bulletSpeed += (Math.floor(bulletTargetX));
      bulletTargetX = 0;
    }
    if (dir === 'right'){
      bulletSpeed += (Math.floor((currentRoom.width-bulletTargetX)));
      bulletTargetX = currentRoom.width;
    }
    bullet.animate({ left : bulletTargetX + 'px', top : bulletTargetY + 'px' }, bulletSpeed, function() {
      bullet.remove();
    });
    checkBulletDamage(dir, player.left + (player.width/2), player.topUsed + (player.height/2), results);
  }
  var initializePlayer = function() {
    player = {
      'elm' : $('#player'),
      'top' : parseInt($('#player').css('top')),
      'left' : parseInt($('#player').css('left')),
      'height' : $('#player').height(),
      'heightUsed' : $('#player').height()-22,
      'width' : $('#player').width(),
      'topUsed' : parseInt($('#player').css('top'))-22,
      'heightReduction' : 22,
      'dir' : 'down',
      'equip' : '',
      'inc' : 20,
      'speed' : 100,
      'inventory' : [null,null,null,null,null,null,null,null,null],
      'full' : false,
      'invPos' : 0,
      'isAnimatingTop' : false,
      'isAnimatingLeft' : false,
      'isAnimatingFeet' : false, 
      'selectedInv' : 0,
      'maxHealth' : 10,
      'currentHealth' : 10,
      'money' : 0,
      'bankAccount' : 230,
      'outfit' : 0,
      'playerSprite' : 0,
      'paused' : false,
      'achievements' : [false,false,false,false],
      'eventList' : {
        'piggySmashed' : false
      }
    };
  }
  var edit_control = function(event) {
    //set up the symbols obj lit
    var alphabet = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
    var numbers = ['0','1','2','3','4','5','6','7','8','9'];
    var symbols = {
      'char20' : 'Caps Lock',
      'char16' : 'Shift',
      'char17' : 'Control',
      'char18' : 'Alt',
      'char91' : 'Command',
      'char32' : 'Space',
      'char37' : 'Left Arrow',
      'char38' : 'Up Arrow',
      'char39' : 'Right Arrow',
      'char40' : 'Down Arrow',
      'char8' : 'Delete',
      'char13' : 'Enter',
      'char192' : '`',
      'char189' : '-',
      'char187' : '=',
      'char219' : '[',
      'char221' : ']',
      'char220' : '\\',
      'char186' : ';',
      'char222' : '\'',
      'char188' : ',',
      'char190' : '.',
      'char191' : '\/',
    }
    for (var i = 0; i < 26; i+=1) {
      symbols['char' + (i+65)] = alphabet[i];
    }
    for (var i = 0; i < 10; i+=1) {
      symbols['char' + (i+48)] = numbers[i];
    }
    var item = $(event.target);
    var list = item.parent().parent().find('tr');
    var currentKeyNumber = parseInt(item.prev().find('span').html()); //e.g. "65"
    var thisControlName = item.prev().html().substring(0,item.prev().html().indexOf(':')); //e.g. "Up"
    var keyNumberList = $(list).find('td span');
    var originalKeyName = item.html();
    var currentKeyName = originalKeyName;
    item.html('<input id="entry" type="text" autocomplete="off" placeholder="Enter key ..." />');
    $('#entry').focus();
    $('#entry').keydown(function(e) {
      var code = (e.keyCode ? e.keyCode : e.which);
      for (var i = 0; i < 222; i+=1) {
        if (symbols['char' + i] !== null && code === i) {
          currentKeyName = symbols['char' + i];
          currentKeyNumber = code;
        }
      }
    });
    $('#entry').keyup(function(){
      //make sure key isnt' already assigned, if it is set currentKeyName back to what it was
      var matchesAnyOtherKeys = false;
      for (var i = 0; i < keyNumberList.length; i+=1) {
        if (currentKeyNumber === parseInt($(keyNumberList[i]).html())) {
          matchesAnyOtherKeys = true;
        }
      }
      for (var i = 0; i < numbers.length; i+=1) {
        if (currentKeyNumber === i+48) {
          matchesAnyOtherKeys = true;
        }
      }
      if (!matchesAnyOtherKeys) {
        item.html(currentKeyName);
        item.prev().find('span').html(currentKeyNumber+'');
        keyAssignments[thisControlName] = currentKeyNumber;
        originalKeyName = currentKeyName;
      } else {
        item.html(originalKeyName);
      }
    });
    $(document).on('click', function() {
      if (item.html() === '<input id="entry" type="text" autocomplete="off" placeholder="Enter key ...">' || item.html() === '<input id="entry" type="text" autocomplete="off" placeholder="Enter key ..."/>') {
        item.html(originalKeyName);
      }
    });
  };
  var titleScreen = function() {
    initializeAll();
    keyAssignments = {
      'Up' : 38,
      'Down' : 40,
      'Left' : 37,
      'Right' : 39,
      'Use Item' : 81,
      'Action' : 87
    };
    $('#title-start').click(function() {
      startGame();
    });
    //this whole custom controls section needs a lot of fixes. see blog for details
    $('#title-options').click(function() {
      $('#t-options').removeClass('hidden');
      $('#t-about').addClass('hidden');
      $('#t-credits').addClass('hidden');
    });
    $('#title-about').click(function() {
      $('#t-about').removeClass('hidden');
      $('#t-options').addClass('hidden');
      $('#t-credits').addClass('hidden');
    });
    $('#title-credits').click(function() {
      $('#t-credits').removeClass('hidden');
      $('#t-options').addClass('hidden');
      $('#t-about').addClass('hidden');
    });
    $('#title-default').click(function() {
      keyAssignments = {
        'Up' : 38,
        'Down' : 40,
        'Left' : 37,
        'Right' : 39,
        'Use Item' : 81,
        'Action' : 87
      };
      var defaultKeyString = '<tr><td>Up:<span>38</span></td><td class="key-press">Up Arrow</td></tr><tr><td>Down:<span>40</span></td><td class="key-press">Down Arrow</td></tr><tr><td>Left:<span>37</span></td><td class="key-press">Left Arrow</td></tr><tr><td>Right:<span>39</span></td><td class="key-press">Right Arrow</td></tr><tr><td>Use Item:<span>81</span></td><td class="key-press">Q</td></tr><tr><td>Action:<span>87</span></td><td class="key-press">W</td></tr><tr><td>Select Item:</td><td>Number row 1-9</td></tr>';
      $('#title-content').find('table').html(defaultKeyString);
    });
    $('#t-options').find('table td.key-press').live('dblclick', edit_control);
  }
  var initializeAll = function() {
    initializePlayer();
    initializeRooms();
    initializeInventory();
  }
  var startGame = function() {
    $('#title').css('display','none');
    currentRoom = setRoom(currentRoom, startingRoom, 0, null);
    selectInvSlot(0);
    console.log(keyAssignments['Down']);
    keyListener(keyAssignments);
    playMusic();
  }
  var keyListener = function(controls) {
    $(document).keydown(function(e) {
      if (!player.paused) {
        var code = (e.keyCode ? e.keyCode : e.which);
        //up
        if (code === controls['Up']) { 
          move(0,-1);
        }
        //down
        if (code === controls['Down']) { 
          move(0,1);
        }
        //left
        if (code === controls['Left']) { 
          move(-1,0);
        }
        //right
        if (code === controls['Right']) { 
          move(1,0);
        }
        //q
        if (code === controls['Use Item']) {
          use(player.selectedInv, player.dir, elements, player.inc);
        }
        //w
        if (code === controls['Action']) {
          action(elements, player.dir, player.inc);
        }
        //numbers 1-9
        for (var i = 0; i < 9; i+=1) {
          if (code === i+49) {
            selectInvSlot(i);
          }
        }
      }
    });
  }
  titleScreen();
});
